# 安全须知

## 绝对不要提交到 Git 的内容

以下文件包含敏感信息，已被 `.gitignore` 排除，**切勿手动强制添加**：

| 文件/目录 | 包含的敏感内容 |
|-----------|---------------|
| `.env` / `.env.*` | Jenkins URL、用户名、API Token |
| `*.db` / `*.sqlite` | 服务器 SSH 密码/私钥、Jenkins 凭据 |
| `data/` | SQLite 数据库文件 |
| `keys/` | SSH 私钥文件 |
| `*.pem` / `*.key` / `*.ppk` | SSH 密钥文件 |

## 开发时的安全约定

1. **密钥/密码不硬编码**：所有凭据通过环境变量或 SQLite（加密）存储，代码中只读变量
2. **示例配置用占位符**：配置模板中使用 `<placeholder>`，如 `JENKINS_URL=http://localhost:8080`
3. **日志不输出敏感信息**：不要 `console.log(password)` / `console.log(privateKey)`
4. **截图脱敏**：提交 issue 或文档截图时，模糊掉 IP、密码、token
5. **测试数据用假数据**：测试用的服务器 IP 用 `192.168.1.x`，密码用 `testpassword`

## .env.example 模板

开发时复制 `.env.example` 为 `.env`，填入真实信息。`.env` 不会被提交。

```bash
cp .env.example .env
# 然后编辑 .env 填入真实信息
```
