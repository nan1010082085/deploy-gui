# 阶段 1：构建前端
FROM node:22-alpine AS builder

WORKDIR /app

# 安装 better-sqlite3 编译需要的工具
RUN apk add --no-cache python3 make g++

# 安装依赖
COPY package*.json ./
RUN npm ci

# 复制源码
COPY . .

# 构建 Next.js
RUN npm run build

# 阶段 2：运行
FROM node:22-alpine AS runner

WORKDIR /app

# 安装 better-sqlite3 运行需要的工具 + tsx
RUN apk add --no-cache python3 make g++

ENV NODE_ENV=production
ENV PORT=3000

# 复制 package.json 和 lock 文件
COPY package*.json ./
COPY tsconfig.json ./

# 安装生产依赖（需要重新编译 better-sqlite3）
RUN npm ci --omit=dev

# 复制构建产物和 server
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/src ./src

# 创建数据目录
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["npx", "tsx", "server.ts"]
