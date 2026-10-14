# syntax=docker/dockerfile:1

# 构建阶段：使用 Node 24 安装依赖并生成静态文件。
FROM node:24-bookworm-slim AS build
WORKDIR /app

# 先复制依赖清单，修改业务代码时可以复用依赖安装步骤。
COPY package.json package-lock.json ./

# 缓存 npm 下载包，依赖变化后重新安装时仍可复用已下载的包。
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit --no-fund

# 复制源码并执行 TypeScript 检查和生产构建。
COPY . .
RUN npm run build

# 运行阶段：通过 Nginx 提供构建后的静态页面。
FROM nginx:stable-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
