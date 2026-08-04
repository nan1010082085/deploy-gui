# Deploy GUI

> 一体化 Web 运维面板：服务器管理 + SSH 终端 + SFTP 文件管理 + SSH 隧道 + Jenkins 部署调度

## 功能

- **服务器管理** - 集中管理所有服务器的 SSH 连接信息（密码/密钥，AES-256 加密存储）
- **Web SSH 终端** - 浏览器直连服务器终端（xterm.js + WebSocket，多标签）
- **SFTP 文件管理** - 浏览/上传/下载/删除/重命名服务器文件
- **SSH 隧道** - 本地端口转发，一键开关，支持自动启动
- **Jenkins 部署** - 触发构建、查看构建历史、读取构建日志

## 技术栈

- **框架**: Next.js 16 (App Router) + TypeScript
- **UI**: Ant Design 5 + Tailwind CSS
- **SSH**: ssh2 (终端/SFTP/隧道)
- **数据库**: SQLite (better-sqlite3)
- **终端**: xterm.js
- **WebSocket**: ws (custom server)
- **部署**: Docker / Docker Compose

## 快速开始

### 开发模式

```bash
# 安装依赖
npm install

# 生成加密密钥
openssl rand -hex 32

# 复制环境配置
cp .env.example .env
# 编辑 .env，填入 ENCRYPT_KEY

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000

### Docker 部署

```bash
# 生成加密密钥
echo "ENCRYPT_KEY=$(openssl rand -hex 32)" > .env

# 启动
docker compose up -d
```

访问 http://localhost:3000

## 使用说明

1. **添加服务器** - 在「服务器」页面添加 SSH 服务器（支持密码/密钥认证）
2. **测试连接** - 点击「测试」按钮验证 SSH 连接
3. **打开终端** - 在「终端」页面选择服务器，打开 Web 终端
4. **管理文件** - 在「文件」页面浏览/上传/下载服务器文件
5. **配置隧道** - 在「隧道」页面创建 SSH 端口转发隧道
6. **配置 Jenkins** - 在「部署」页面填写 Jenkins URL/User/Token
7. **一键部署** - 在「部署」页面点击 Job 卡片的「部署」按钮触发 Jenkins 构建

## 项目结构

```
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/             # API Routes
│   │   │   ├── servers/     # 服务器 CRUD + 测试连接
│   │   │   ├── files/       # SFTP 文件操作
│   │   │   ├── tunnels/     # 隧道管理
│   │   │   └── jenkins/     # Jenkins API
│   │   ├── servers/         # 服务器管理页
│   │   ├── terminal/        # Web 终端页
│   │   ├── files/           # 文件管理页
│   │   ├── tunnels/         # 隧道管理页
│   │   └── deploy/          # 部署面板页
│   ├── lib/                 # 后端核心模块
│   │   ├── db.ts            # SQLite + 数据模型
│   │   ├── crypto.ts        # AES-256-GCM 加密
│   │   ├── ssh-pool.ts      # SSH 连接池
│   │   ├── tunnel.ts        # 隧道管理器
│   │   └── jenkins.ts       # Jenkins API 封装
│   └── db/
│       └── schema.sql       # 数据库建表语句
├── server.ts                # Custom server (Next.js + WebSocket)
├── Dockerfile
├── docker-compose.yml
└── PLAN.md                  # 开发计划文档
```

## 安全

- 所有密码/私钥使用 AES-256-GCM 加密存储在 SQLite 中
- Jenkins Token 同样加密存储
- `.env` / `*.db` / 密钥文件已被 `.gitignore` 排除
- 详见 [SECURITY.md](./SECURITY.md)

## 开发计划

详见 [PLAN.md](./PLAN.md)

## License

MIT
