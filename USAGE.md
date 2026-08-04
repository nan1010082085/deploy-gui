# Deploy GUI 使用文档

> 从零开始：在你的服务器上部署 Deploy GUI，并用它管理所有服务器。

---

## 目录

1. [部署到你的服务器](#1-部署到你的服务器)
2. [首次配置](#2-首次配置)
3. [服务器管理](#3-服务器管理)
4. [Web 终端](#4-web-终端)
5. [文件管理](#5-文件管理)
6. [SSH 隧道](#6-ssh-隧道)
7. [Jenkins 部署](#7-jenkins-部署)
8. [日常运维](#8-日常运维)
9. [常见问题](#9-常见问题)

---

## 1. 部署到你的服务器

### 方式一：Docker 部署（推荐）

**前提**：服务器已安装 Docker 和 Docker Compose。

```bash
# 1. 克隆项目
git clone https://github.com/nan1010082085/deploy-gui.git
cd deploy-gui

# 2. 生成加密密钥（用于加密 SSH 密码/私钥）
echo "ENCRYPT_KEY=$(openssl rand -hex 32)" > .env

# 3. 一键启动
docker compose up -d

# 4. 查看日志确认启动成功
docker compose logs -f
```

看到 `> Deploy GUI on http://localhost:3000` 即启动成功。

**访问**：浏览器打开 `http://你的服务器IP:3000`

### 方式二：直接运行（不用 Docker）

**前提**：服务器已安装 Node.js 20+。

```bash
# 1. 克隆项目
git clone https://github.com/nan1010082085/deploy-gui.git
cd deploy-gui

# 2. 安装依赖
npm install

# 3. 生成加密密钥
echo "ENCRYPT_KEY=$(openssl rand -hex 32)" > .env

# 4. 构建
npm run build

# 5. 启动（生产模式）
NODE_ENV=production npm start

# 或用 PM2 守护进程
npm install -g pm2
pm2 start "npx tsx server.ts" --name deploy-gui
pm2 save
pm2 startup
```

### 端口修改

默认端口 3000，如需修改：

```bash
# Docker 方式 - 编辑 docker-compose.yml
ports:
  - "8080:3000"    # 改成你想要的端口

# 直接运行 - 编辑 .env
echo "PORT=8080" >> .env
```

### 数据持久化

| 数据 | 位置 | 说明 |
|------|------|------|
| SQLite 数据库 | `data/deploy-gui.db` | 服务器配置、隧道配置、Jenkins 配置 |
| 加密密钥 | `.env` 中的 `ENCRYPT_KEY` | **务必备份**，丢了就无法解密已存储的密码 |

**备份**：

```bash
# 备份数据库和密钥
cp data/deploy-gui.db data/deploy-gui.db.bak
cp .env .env.bak

# 恢复
cp data/deploy-gui.db.bak data/deploy-gui.db
cp .env.bak .env
docker compose restart
```

> ⚠️ **注意**：`ENCRYPT_KEY` 一旦丢失，所有已保存的 SSH 密码/私钥都无法解密，只能重新输入。

### Nginx 反向代理（可选）

如果你有域名，建议加 Nginx 反代 + HTTPS：

```nginx
server {
    listen 80;
    server_name deploy.yourdomain.com;

    # WebSocket 支持（终端需要）
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

配好后用 certbot 加 HTTPS：

```bash
certbot --nginx -d deploy.yourdomain.com
```

### 安全建议

| 措施 | 说明 |
|------|------|
| 不要暴露在公网 | 最好只在内网使用，或加 IP 白名单 |
| 加 HTTPS | 如果必须公网访问，务必加 HTTPS |
| 定期备份 .env 和 data/ | 加密密钥丢了数据就没了 |
| 不要分享 ENCRYPT_KEY | 这个密钥能解密所有存储的密码 |

---

## 2. 首次配置

### 第一步：添加服务器

1. 打开浏览器访问 Deploy GUI
2. 自动跳转到「服务器」页面
3. 点击右上角「添加服务器」
4. 填写信息：

| 字段 | 说明 | 示例 |
|------|------|------|
| 名称 | 给服务器起个好记的名字 | 生产-Web01 |
| 主机 | IP 地址或域名 | 10.0.0.1 |
| 端口 | SSH 端口，默认 22 | 22 |
| 用户名 | SSH 登录用户 | root |
| 认证方式 | 密码 或 私钥 | 密码 |
| 密码/私钥 | 填入密码或粘贴私钥内容 | •••••••• |

5. 点击「测试连接」验证能连上
6. 测试成功后点「创建」

### 第二步：配置 Jenkins（如果你用 Jenkins 部署）

1. 进入「部署」页面
2. 首次使用会提示「Jenkins 未配置」，点击「配置 Jenkins」
3. 填写：

| 字段 | 说明 | 示例 |
|------|------|------|
| Jenkins URL | 你的 Jenkins 地址 | http://jenkins.yourdomain.com:8080 |
| 用户名 | Jenkins 登录用户 | admin |
| API Token | 在 Jenkins 获取（见下方） | 11a2b3c4d5e6... |

**获取 Jenkins API Token**：

1. 登录 Jenkins
2. 点击右上角用户名 -> 设置（Configure）
3. 找到「API Token」区域
4. 点击「Add new Token」-> 生成 -> 复制

4. 保存后自动加载所有 Jenkins Job

---

## 3. 服务器管理

### 添加服务器

在「服务器」页面点「添加服务器」，填表保存。

### 编辑服务器

点「编辑」按钮修改信息。密码/私钥留空表示不修改。

### 测试连接

点「测试」按钮，10 秒内返回结果：
- ✅ 连接成功
- ❌ 连接失败（显示具体错误）

### 删除服务器

点「删除」按钮，确认后删除。关联的隧道会一并删除。

---

## 4. Web 终端

### 打开终端

1. 进入「终端」页面
2. 在右上角下拉框选择服务器
3. 点「打开终端」
4. 新标签页打开，等待 SSH 连接建立
5. 看到 `ready` 后即可输入命令

### 多标签

可以同时打开多个服务器的终端，每个标签独立。点标签上的 × 关闭。

### 终端操作

- 和普通 SSH 终端完全一样：`ls`、`top`、`vim`、`htop` 等
- 支持鼠标滚轮滚动
- 窗口大小变化时终端自动适配

---

## 5. 文件管理

### 浏览文件

1. 进入「文件」页面
2. 右上角选择服务器
3. 自动列出根目录 `/` 的内容
4. 点击文件夹进入，面包屑导航可以返回上级

### 上传文件

点「上传」按钮，选择本地文件，上传到当前目录。

### 下载文件

点文件行的「下载」按钮，浏览器自动下载。

### 新建目录

点「新建目录」按钮，输入目录名。

### 删除 / 重命名

每行右侧有删除（垃圾桶图标）和重命名（编辑图标）按钮。

---

## 6. SSH 隧道

### 什么是 SSH 隧道

SSH 隧道 = 本地端口转发。通过 SSH 服务器把远程端口映射到你本地。

```
你的电脑:3306  ----SSH隧道---->  服务器:3306 (MySQL)
```

等同于命令 `ssh -L 3306:127.0.0.1:3306 user@server`，但不用开终端，一键开关。

### 典型用途

| 场景 | 本地端口 | 远程主机 | 远程端口 |
|------|---------|---------|---------|
| 远程 MySQL | 3306 | 127.0.0.1 | 3306 |
| 远程 Redis | 6379 | 127.0.0.1 | 6379 |
| 远程 PostgreSQL | 5432 | 127.0.0.1 | 5432 |
| 内网 Web 服务 | 8080 | 192.168.1.100 | 80 |
| 远程 MongoDB | 27017 | 127.0.0.1 | 27017 |

### 创建隧道

1. 进入「隧道」页面
2. 点「添加隧道」
3. 填写：

| 字段 | 说明 | 示例 |
|------|------|------|
| 名称 | 好记的名字 | MySQL 隧道 |
| 服务器 | 选择已添加的服务器 | 生产-DB01 |
| 本地端口 | 你电脑上监听的端口 | 3306 |
| 远程主机 | SSH 服务器上看目标服务的地址 | 127.0.0.1 |
| 远程端口 | 目标服务的端口 | 3306 |
| 自动启动 | 服务启动时自动开启隧道 | 开 |

4. 保存后点「启动」

### 使用隧道

隧道启动后，在本地直接访问：

```bash
# MySQL 隧道（本地 3306 -> 服务器 3306）
mysql -h 127.0.0.1 -P 3306 -u root -p

# Redis 隧道
redis-cli -h 127.0.0.1 -p 6379

# Web 服务隧道（浏览器访问）
open http://127.0.0.1:8080
```

### 停止隧道

点「停止」按钮。隧道状态会实时显示：
- 🟢 运行中
- ⚪ 已停止

---

## 7. Jenkins 部署

### 前提

你已经在 Jenkins 上配置好了项目的 Job。每个 Job 调用你项目里的 deploy 脚本。

### 触发部署

1. 进入「部署」页面
2. 看到所有 Jenkins Job 的卡片
3. 找到要部署的项目，点「部署」按钮
4. Jenkins 开始构建，卡片状态变为「构建中...」
5. 构建过程中每 5 秒自动刷新状态
6. 完成后显示「成功」或「失败」

### 查看构建历史

点卡片底部的「历史」按钮，弹出该 Job 的构建历史列表，包含：
- 构建编号（#1, #2, ...）
- 构建结果（成功/失败/中止）
- 构建时间
- 构建耗时

### 查看构建日志

在构建历史中点「日志」按钮，弹出终端风格的构建日志。

### 状态颜色含义

| 颜色 | 含义 |
|------|------|
| 🟢 蓝色 | 上次构建成功 |
| 🔴 红色 | 上次构建失败 |
| 🟡 黄色 | 上次构建不稳定 |
| 🔵 闪烁 | 正在构建中 |
| ⚪ 灰色 | 未构建 / 禁用 |

---

## 8. 日常运维

### 更新项目

```bash
cd deploy-gui
git pull
docker compose up -d --build
```

### 查看日志

```bash
# Docker
docker compose logs -f

# PM2
pm2 logs deploy-gui
```

### 重启服务

```bash
# Docker
docker compose restart

# PM2
pm2 restart deploy-gui
```

### 备份

```bash
# 备份所有数据
tar czf deploy-gui-backup-$(date +%Y%m%d).tar.gz data/ .env
```

### 恢复

```bash
# 停止服务
docker compose down

# 恢复数据
tar xzf deploy-gui-backup-20260803.tar.gz

# 重新启动
docker compose up -d
```

---

## 9. 常见问题

### Q: 终端连不上？

**检查项**：
1. 服务器 SSH 服务是否开启：`systemctl status sshd`
2. 端口是否正确：有些服务器改了默认 22 端口
3. 防火墙是否放行：`iptables -L` 或 `ufw status`
4. 在「服务器」页面点「测试连接」看具体错误

### Q: 文件上传失败？

**可能原因**：
1. 磁盘空间不足
2. 没有写权限 - 检查目标目录的权限
3. 文件太大 - 当前 MVP 版本上传整个文件到内存，超过 100MB 可能有问题

### Q: 隧道启动失败「端口被占用」？

```bash
# 查看端口占用
lsof -i :3306

# 换一个本地端口，比如 13306
```

### Q: Jenkins Job 列表为空？

**检查项**：
1. Jenkins URL 是否能访问
2. API Token 是否正确
3. 用户名是否有权限查看 Job
4. 看 Docker 日志：`docker compose logs | grep -i jenkins`

### Q: Docker 重启后隧道没有自动启动？

确认隧道配置里「自动启动」开关是打开的。自动启动的隧道会在服务启动时自动连接。

### Q: 忘记了 ENCRYPT_KEY 怎么办？

无法找回。只能：
1. 删除 `data/deploy-gui.db`
2. 重新生成 `ENCRYPT_KEY`
3. 重新添加所有服务器和配置

所以 **务必备份 .env 文件**。

### Q: 如何在多台电脑上使用？

Deploy GUI 是 Web 应用，部署在服务器上后，任何能访问到该端口的电脑都能用浏览器打开使用。不需要在每台电脑上安装。

### Q: 支持多少台服务器？

SQLite 轻松支撑上千台服务器的配置数据。SSH 连接池会在空闲时自动断开，不会占用太多资源。
