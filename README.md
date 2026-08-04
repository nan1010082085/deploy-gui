# Deploy GUI

> 一体化 Web 运维面板：服务器管理 · SSH 终端 · 文件管理 · SSH 隧道 · Jenkins 部署

## 功能

| 模块 | 说明 |
|------|------|
| 服务器管理 | 集中管理 SSH 连接信息，密码/私钥 AES-256 加密存储 |
| Web SSH 终端 | 浏览器直连服务器终端，多标签，xterm.js |
| SFTP 文件管理 | 浏览 / 上传 / 下载 / 删除 / 重命名 |
| SSH 隧道 | 本地端口转发，一键开关，支持自动启动 |
| Jenkins 部署 | 触发构建、查看构建历史和日志 |

## 技术栈

Next.js 16 · TypeScript · Ant Design 5 · ssh2 · SQLite · xterm.js · WebSocket

## 快速开始

### Docker 部署（推荐）

```bash
git clone https://github.com/nan1010082085/deploy-gui.git
cd deploy-gui
echo "ENCRYPT_KEY=$(openssl rand -hex 32)" > .env
docker compose up -d
```

访问 `http://localhost:3000`

### 直接运行

```bash
git clone https://github.com/nan1010082085/deploy-gui.git
cd deploy-gui
npm install
echo "ENCRYPT_KEY=$(openssl rand -hex 32)" > .env
npm run build
npm start
```

## 项目结构

```
├── src/
│   ├── app/
│   │   ├── api/          # API Routes (servers/files/tunnels/jenkins)
│   │   ├── servers/      # 服务器管理
│   │   ├── terminal/     # Web 终端
│   │   ├── files/        # 文件管理
│   │   ├── tunnels/      # 隧道管理
│   │   └── deploy/       # Jenkins 部署
│   ├── lib/              # 核心模块 (db/crypto/ssh-pool/tunnel/jenkins)
│   └── db/               # 数据库 schema
├── server.ts             # Custom server (Next.js + WebSocket)
├── Dockerfile
├── docker-compose.yml
└── USAGE.md              # 使用文档
```

## 文档

详细使用说明见 [USAGE.md](./USAGE.md)

## License

MIT
