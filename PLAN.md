# Deploy GUI - 开发计划文档

> 一体化 Web 运维面板：服务器管理 + SSH 终端 + SFTP 文件管理 + SSH 隧道 + Jenkins 部署调度

## 1. 项目定位

不做 CI/CD 引擎，不重复造 Jenkins 的轮子。聚焦以下 5 个核心模块：

| 模块 | 职责 | 替代方案 |
|------|------|----------|
| 服务器管理 | 管理服务器连接信息（IP/端口/密钥） | - |
| Web SSH 终端 | 浏览器直连服务器终端 | xterm.js + ssh2 |
| SFTP 文件管理 | 浏览/上传/下载服务器文件 | ssh2 SFTP API |
| SSH 隧道管理 | 本地端口转发，一键开关 | ssh2 forwardOut |
| Jenkins 部署调度 | 触发构建、查看状态、读取日志 | Jenkins REST API |

**明确不做的事**：
- ❌ Git 仓库管理（Jenkins 负责）
- ❌ 构建/打包逻辑（Jenkins 调用你现有的 deploy 脚本）
- ❌ 复杂部署流程编排（Jenkins Pipeline 负责）
- ❌ 用户权限体系（MVP 阶段单用户，内网使用）

## 2. 技术栈

```
框架:  Next.js 16 (App Router) + TypeScript
UI:    Ant Design 5 + Tailwind CSS
SSH:   ssh2 (终端/SFTP/隧道)
数据库: SQLite (better-sqlite3，单文件，零运维)
终端:  xterm.js + WebSocket (ws, custom server)
部署:  Docker / Docker Compose
```

### 为什么选这套

| 选择 | 理由 |
|------|------|
| **ssh2** (Node.js) | 一个库覆盖 SSH 终端 + SFTP + 端口转发，90% 的核心逻辑都依赖它 |
| **Fastify** | 比 Express 快，内置 Schema 校验，插件体系清晰 |
| **Naive UI** | Vue 3 原生，组件丰富，暗色主题开箱即用，不像 Element Plus 那么重 |
| **SQLite** | 单用户面板不需要 MySQL，一个文件搞定，备份就是复制文件 |
| **xterm.js** | Web 终端事实标准，VS Code / Spug / JumpServer 都用它 |

### 核心依赖清单

**后端**:
```
ssh2          - SSH 连接 / SFTP / 端口转发
fastify       - HTTP 框架
@fastify/websocket - WebSocket 支持（终端透传）
@fastify/static    - 静态文件服务
better-sqlite3     - SQLite 驱动
axios         - 调用 Jenkins REST API
dayjs         - 时间格式化
```

**前端**:
```
vue           - 框架
vue-router    - 路由
naive-ui      - UI 组件库
@xterm/xterm  - 终端渲染
@xterm/addon-fit - 终端自适应大小
@xterm/addon-web-links - 终端链接可点击
axios         - HTTP 请求
@vueuse/core  - 工具函数
```

## 3. 架构设计

```
deploy-gui/
├── server/                    # 后端
│   ├── src/
│   │   ├── index.ts           # 入口，启动 Fastify
│   │   ├── db/
│   │   │   ├── schema.sql     # 建表语句
│   │   │   └── index.ts       # 数据库连接 + 查询封装
│   │   ├── routes/
│   │   │   ├── servers.ts     # 服务器 CRUD
│   │   │   ├── terminal.ts    # WebSocket 终端
│   │   │   ├── files.ts       # SFTP 文件操作
│   │   │   ├── tunnels.ts     # SSH 隧道管理
│   │   │   └── jenkins.ts     # Jenkins API 代理
│   │   ├── services/
│   │   │   ├── ssh-pool.ts    # SSH 连接池（复用连接）
│   │   │   ├── sftp.ts        # SFTP 操作封装
│   │   │   ├── tunnel.ts      # 隧道管理器
│   │   │   └── jenkins.ts     # Jenkins API 封装
│   │   └── utils/
│   │       └── crypto.ts      # 密钥/密码加密存储
│   ├── package.json
│   └── tsconfig.json
│
├── web/                       # 前端
│   ├── src/
│   │   ├── App.vue
│   │   ├── main.ts
│   │   ├── router/
│   │   │   └── index.ts
│   │   ├── views/
│   │   │   ├── Servers.vue       # 服务器列表
│   │   │   ├── Terminal.vue      # Web 终端（多标签）
│   │   │   ├── FileManager.vue   # SFTP 文件管理
│   │   │   ├── Tunnels.vue       # 隧道管理
│   │   │   └── Deploy.vue        # Jenkins 部署面板
│   │   ├── components/
│   │   │   ├── ServerForm.vue    # 服务器表单
│   │   │   ├── TerminalTab.vue   # 单个终端标签
│   │   │   ├── FileTree.vue      # 文件树
│   │   │   ├── FileUploader.vue  # 上传组件
│   │   │   └── TunnelRow.vue     # 隧道行
│   │   ├── stores/
│   │   │   └── servers.ts        # 全局状态
│   │   ├── api/
│   │   │   └── index.ts          # API 封装
│   │   └── styles/
│   ├── package.json
│   └── vite.config.ts
│
├── docker-compose.yml         # 一键部署
├── PLAN.md                    # 本文档
└── README.md
```

### 数据模型

```sql
-- 服务器表
CREATE TABLE servers (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,           -- 别名 "生产-Web01"
    host        TEXT NOT NULL,           -- IP 或域名
    port        INTEGER DEFAULT 22,
    username    TEXT NOT NULL,
    auth_type   TEXT NOT NULL,           -- 'password' | 'key'
    credential  TEXT NOT NULL,           -- 加密存储的密码或私钥
    created_at  TEXT DEFAULT (datetime('now')),
    updated_at  TEXT DEFAULT (datetime('now'))
);

-- SSH 隧道表
CREATE TABLE tunnels (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,         -- "MySQL 隧道"
    server_id     INTEGER NOT NULL,      -- 关联服务器
    local_port    INTEGER NOT NULL,      -- 本地端口 3306
    remote_host   TEXT DEFAULT '127.0.0.1', -- 远程目标
    remote_port   INTEGER NOT NULL,      -- 远程端口 3306
    auto_start    INTEGER DEFAULT 0,     -- 是否自动启动
    status        TEXT DEFAULT 'stopped', -- 运行时状态
    FOREIGN KEY (server_id) REFERENCES servers(id)
);

-- Jenkins 项目映射表
CREATE TABLE projects (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,       -- 项目名
    server_id       INTEGER,             -- 部署目标服务器（可选）
    jenkins_job     TEXT NOT NULL,       -- Jenkins Job 名称
    deploy_path     TEXT,                -- 部署路径 /var/www/myapp
    description     TEXT,
    created_at      TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (server_id) REFERENCES servers(id)
);

-- Jenkins 配置（单行表）
CREATE TABLE config (
    key   TEXT PRIMARY KEY,
    value TEXT
);
-- 存储: jenkins_url, jenkins_user, jenkins_token
```

### SSH 连接池设计

```
                    SSHConnectionPool
                    ┌──────────────────────────┐
                    │  Map<serverId, SSHConn>  │
                    │                          │
  Terminal ────────►│  conn.shell()  → stream  │
  SFTP ────────────►│  conn.sftp()   → sftp    │
  Tunnel ──────────►│  conn.forwardOut()       │
  Deploy(exec) ────►│  conn.exec()  → stream   │
                    │                          │
                    │  引用计数: 0 时延时关闭   │
                    └──────────────────────────┘
```

核心思路：同一个服务器复用一条 SSH 连接，不同模块从连接上开 channel。
- 终端：`conn.shell()` 开一个交互式 shell channel
- SFTP：`conn.sftp()` 开一个 SFTP subsystem channel
- 隧道：每个隧道创建本地 TCP Server，连接进来时 `conn.forwardOut()` 转发
- 远程命令：`conn.exec()` 执行一次性命令

## 4. 分步计划

### Phase 1: 项目骨架 + 服务器管理（Day 1-2）

**目标**：能添加、编辑、删除服务器，验证 SSH 连接是否通。

**后端**:
- [ ] 初始化 `server/` 项目，安装 Fastify + better-sqlite3 + ssh2
- [ ] 创建 SQLite 数据库，执行 schema.sql 建表
- [ ] 实现密钥/密码的 AES 加密存储（`utils/crypto.ts`）
- [ ] 实现 `routes/servers.ts`：
  - `GET /api/servers` - 列表
  - `POST /api/servers` - 创建
  - `PUT /api/servers/:id` - 更新
  - `DELETE /api/servers/:id` - 删除
  - `POST /api/servers/:id/test` - 测试 SSH 连接

**前端**:
- [ ] 初始化 `web/` 项目，安装 Vue3 + Vite + Naive UI
- [ ] 搭建布局：左侧导航栏 + 右侧内容区
- [ ] 实现 `Servers.vue`：服务器列表表格
- [ ] 实现 `ServerForm.vue`：添加/编辑表单（支持密码/私钥切换）
- [ ] 测试连接按钮（调 `/test` 接口，显示成功/失败）

**验证标准**：能添加一台服务器，点"测试连接"显示"连接成功"。

---

### Phase 2: Web SSH 终端（Day 3-4）

**目标**：在浏览器打开终端，直连服务器执行命令。

**后端**:
- [ ] 实现 `services/ssh-pool.ts`：SSH 连接池
  - `getConnection(serverId)` - 获取或创建连接
  - 引用计数，空闲超时自动断开
- [ ] 实现 `routes/terminal.ts`：WebSocket 端点
  - `WS /api/terminal/:serverId` - 建立终端连接
  - 流程：WebSocket 收到数据 -> 写入 SSH shell stream -> SSH stream 输出 -> 回传 WebSocket
  - 处理 resize 事件（调整终端大小）

**前端**:
- [ ] 实现 `Terminal.vue`：多标签终端页面
  - 左侧服务器列表，点击打开新标签
  - 每个标签一个 xterm.js 实例
- [ ] 实现 `TerminalTab.vue`：单个终端标签
  - 初始化 xterm.js，连接 WebSocket
  - 双向数据绑定：键盘输入 -> WS 发送，WS 接收 -> 终端渲染
  - 处理窗口 resize，发送新尺寸到后端
  - 标签关闭时断开 WebSocket

**验证标准**：在浏览器打开终端，能 `ls`、`top`、`vim` 等正常交互。

**关键代码思路**:
```typescript
// 后端 terminal WebSocket 核心逻辑
fastify.get('/api/terminal/:serverId', { websocket: true }, (conn, req) => {
  const { serverId } = req.params;
  const ssh = sshPool.getConnection(serverId);
  ssh.shell({ term: 'xterm-256color', cols: 80, rows: 24 }, (err, stream) => {
    // WS -> SSH
    conn.socket.on('message', (data) => {
      const msg = JSON.parse(data);
      if (msg.type === 'input') stream.write(msg.data);
      if (msg.type === 'resize') stream.setWindow(msg.rows, msg.cols);
    });
    // SSH -> WS
    stream.on('data', (data) => {
      conn.socket.send(JSON.stringify({ type: 'output', data: data.toString() }));
    });
    // 清理
    conn.socket.on('close', () => stream.end());
    stream.on('close', () => conn.socket.close());
  });
});
```

---

### Phase 3: SFTP 文件管理（Day 5-7）

**目标**：浏览服务器文件目录，上传/下载/删除文件。

**后端**:
- [ ] 实现 `services/sftp.ts`：SFTP 操作封装
  - `list(remotePath)` - 列目录（返回文件名/大小/权限/修改时间）
  - `stat(remotePath)` - 获取文件信息
  - `mkdir(remotePath)` - 创建目录
  - `delete(remotePath)` - 删除文件
  - `rmdir(remotePath)` - 删除目录
  - `rename(oldPath, newPath)` - 重命名
  - `upload(localPath, remotePath, onProgress)` - 上传文件
  - `download(remotePath, localPath, onProgress)` - 下载文件
- [ ] 实现 `routes/files.ts`：
  - `GET /api/files/:serverId?path=` - 列目录
  - `POST /api/files/:serverId/mkdir` - 创建目录
  - `DELETE /api/files/:serverId?path=` - 删除
  - `POST /api/files/:serverId/upload` - 上传（multipart）
  - `GET /api/files/:serverId/download?path=` - 下载
  - `POST /api/files/:serverId/rename` - 重命名

**前端**:
- [ ] 实现 `FileManager.vue`：文件管理主页面
  - 左侧：文件树（可折叠目录）
  - 右侧：当前目录文件列表（表格：名称/大小/权限/修改时间）
  - 顶部：面包屑导航（路径切换）
  - 操作按钮：新建文件夹、上传、刷新
- [ ] 实现 `FileUploader.vue`：上传组件
  - 拖拽上传 + 点击选择
  - 上传进度条
  - 多文件队列
- [ ] 右键菜单/操作按钮：下载、删除、重命名

**验证标准**：能浏览 `/var/log/`，上传一个文件到 `/tmp/`，再下载回来。

---

### Phase 4: SSH 隧道管理（Day 8-9）

**目标**：配置本地端口转发，一键开启/关闭，查看隧道状态。

**后端**:
- [ ] 实现 `services/tunnel.ts`：隧道管理器
  - `start(tunnelId)` - 启动隧道
  - `stop(tunnelId)` - 关闭隧道
  - `getStatus(tunnelId)` - 获取状态
  - `listActive()` - 列出所有活跃隧道
- [ ] 实现 `routes/tunnels.ts`：
  - `GET /api/tunnels` - 列表（含运行状态）
  - `POST /api/tunnels` - 创建
  - `PUT /api/tunnels/:id` - 更新
  - `DELETE /api/tunnels/:id` - 删除
  - `POST /api/tunnels/:id/start` - 启动
  - `POST /api/tunnels/:id/stop` - 停止

**隧道启动核心逻辑**:
```typescript
// 启动一个本地端口转发隧道
// 效果等同于: ssh -L localPort:remoteHost:remotePort user@server
function startTunnel(tunnel: Tunnel, sshConn: SSHConn): void {
  const server = net.createServer((socket) => {
    sshConn.forwardOut(
      socket.remoteAddress, socket.remotePort,
      tunnel.remote_host, tunnel.remote_port,
      (err, stream) => {
        if (err) { socket.destroy(); return; }
        socket.pipe(stream);
        stream.pipe(socket);
        socket.on('close', () => stream.end());
        stream.on('close', () => socket.destroy());
      }
    );
  });
  server.listen(tunnel.local_port, () => {
    tunnel.status = 'running';
  });
  server.on('error', () => { tunnel.status = 'error'; });
  // 保存 server 引用，stop 时关闭
  activeTunnels.set(tunnel.id, server);
}
```

**前端**:
- [ ] 实现 `Tunnels.vue`：隧道管理页面
  - 表格：名称 / 服务器 / 本地端口 → 远程地址:端口 / 状态 / 操作
  - 状态指示灯：🟢 运行中 / 🔴 已停止 / 🟡 错误
  - 操作：启动 / 停止 / 编辑 / 删除
  - 创建隧道表单：选服务器 + 填端口
- [ ] 应用启动时自动启动 `auto_start` 的隧道

**验证标准**：创建隧道 `localhost:3306 → server:3306`，启动后用 `mysql -h 127.0.0.1 -P 3306` 能连上。

---

### Phase 5: Jenkins 部署集成（Day 10-11）

**目标**：在面板上触发 Jenkins 构建，查看构建状态和日志。

**前置条件**：你的 Jenkins 已配置好各项目的 Job（调用现有 deploy 脚本）。

**后端**:
- [ ] 实现 `services/jenkins.ts`：Jenkins API 封装
  - `listJobs()` - 获取 Job 列表
  - `build(jobName, params?)` - 触发构建
  - `getBuildInfo(jobName, buildNumber)` - 获取构建信息
  - `getBuildLog(jobName, buildNumber)` - 获取构建日志
  - `getQueue()` - 获取排队中的构建
- [ ] 实现 `routes/jenkins.ts`：
  - `GET /api/jenkins/jobs` - Job 列表
  - `POST /api/jenkins/jobs/:name/build` - 触发构建
  - `GET /api/jenkins/jobs/:name/builds` - 构建历史
  - `GET /api/jenkins/jobs/:name/builds/:number/log` - 构建日志
  - `GET /api/jenkins/jobs/:name/builds/:number/status` - 构建状态
- [ ] Jenkins 配置页面：存储 `jenkins_url` / `jenkins_user` / `jenkins_token` 到 config 表

**Jenkins API 要点**:
```typescript
// Jenkins REST API 示例
// 获取 Job 列表
GET {jenkins_url}/api/json?tree=jobs[name,color,url]

// 触发构建（无参数）
POST {jenkins_url}/job/{jobName}/build

// 触发构建（带参数）
POST {jenkins_url}/job/{jobName}/buildWithParameters?PARAM=value

// 获取构建信息
GET {jenkins_url}/job/{jobName}/lastBuild/api/json

// 获取构建日志（流式）
GET {jenkins_url}/job/{jobName}/{buildNumber}/consoleText

// 认证: HTTP Basic Auth (username + API Token)
```

**前端**:
- [ ] 实现 `Deploy.vue`：部署面板
  - 项目卡片列表（每个卡片 = 一个 Jenkins Job）
    - 项目名称、上次构建状态（✅/❌/🔵）、上次构建时间
    - "部署"按钮 → 触发构建
    - "查看日志"按钮 → 打开日志面板
  - 构建日志面板：终端风格的日志输出（可复用 xterm.js 或简单的 `<pre>` 滚动）
  - 构建状态轮询：触发后每 3 秒轮询状态，更新进度
- [ ] 可选：将项目关联到服务器，部署后可直接打开终端查看服务状态

**验证标准**：在面板上点"部署"按钮，Jenkins 开始构建，能看到构建状态和日志。

---

### Phase 6: 整合 + 部署（Day 12-13）

**目标**：一体化体验，Docker 一键部署。

**整合工作**:
- [ ] 全局布局优化：左侧导航（服务器/终端/文件/隧道/部署）
- [ ] 服务器详情页：一台服务器的终端/文件/隧道/部署整合在一个页面
  ```
  ┌─────────────────────────────────────┐
  │  生产-Web01  10.0.0.1               │
  │  ┌──────┬──────┬──────┬──────┐      │
  │  │ 终端  │ 文件  │ 隧道  │ 部署  │      │
  │  └──────┴──────┴──────┴──────┘      │
  │                                     │
  │  [当前 Tab 的内容区]                  │
  └─────────────────────────────────────┘
  ```
- [ ] 服务器详情页支持快速操作：
  - 一键打开终端
  - 一键浏览文件
  - 查看该服务器上的活跃隧道
  - 查看部署到该服务器的项目状态

**Docker 部署**:
- [ ] 编写 `Dockerfile`（多阶段构建：前端 build -> 后端 + 前端静态文件）
- [ ] 编写 `docker-compose.yml`：
  ```yaml
  version: '3'
  services:
    deploy-gui:
      build: .
      ports:
        - "8080:3000"
      volumes:
        - ./data:/app/data        # SQLite 数据持久化
        - ./keys:/app/keys        # SSH 密钥文件
      restart: unless-stopped
  ```
- [ ] 后端启动时自动建表 + 自动启动 `auto_start` 隧道

**安全加固（可选，视使用场景）**:
- [ ] 简单登录页（单密码，存 config 表）
- [ ] IP 白名单中间件
- [ ] HTTPS（反代或内置）

**验证标准**：`docker compose up -d` 后浏览器访问 `http://localhost:8080`，所有功能可用。

---

## 5. 时间线总览

```
Week 1
  Day 1-2  ████████████  Phase 1: 骨架 + 服务器管理
  Day 3-4  ████████████  Phase 2: Web SSH 终端
  Day 5-7  ██████████████████  Phase 3: SFTP 文件管理

Week 2
  Day 8-9  ████████████  Phase 4: SSH 隧道管理
  Day 10-11 ████████████  Phase 5: Jenkins 部署集成
  Day 12-13 ████████████  Phase 6: 整合 + Docker 部署
```

每个 Phase 结束时都有一个**可验证的交付物**，可以随时停下来使用已完成的功能。

## 6. 风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| SSH 连接断开导致终端/隧道失效 | 高 | 连接池加自动重连机制，前端检测断开后提示 |
| 大文件上传内存占用 | 中 | SFTP 上传用 stream 模式，不一次性读入内存 |
| 端口冲突（本地端口被占用） | 中 | 启动隧道前检测端口占用，UI 提示 |
| Jenkins API 跨域/网络不通 | 中 | 后端代理 Jenkins API，前端不直连 |
| 密钥/密码泄露 | 高 | AES 加密存储，不建议公网裸跑 |

## 7. 后续可扩展方向（MVP 之后再考虑）

- 多用户 + RBAC 权限
- 终端会话录制回放（类似 JumpServer）
- 文件在线编辑（Monaco Editor）
- 部署回滚（Jenkins 回滚 Job）
- 服务器监控（CPU/内存/磁盘）
- 通知集成（钉钉/飞书/微信）
- 操作审计日志
