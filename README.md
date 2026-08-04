# Deploy GUI

> 一体化 Web 运维面板：服务器管理 + SSH 终端 + SFTP 文件管理 + SSH 隧道 + Jenkins 部署调度

## 功能

- **服务器管理** - 集中管理所有服务器的 SSH 连接信息
- **Web SSH 终端** - 浏览器直连服务器终端（xterm.js）
- **SFTP 文件管理** - 浏览/上传/下载/删除服务器文件
- **SSH 隧道** - 本地端口转发，一键开关
- **Jenkins 部署** - 触发构建、查看状态、读取日志

## 技术栈

- 后端: Node.js + Fastify + ssh2 + SQLite
- 前端: Vue 3 + Vite + Naive UI + xterm.js

## 开发计划

详见 [PLAN.md](./PLAN.md)

## 安全

详见 [SECURITY.md](./SECURITY.md)

## License

MIT
