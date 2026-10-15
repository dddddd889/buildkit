# BuildKit 前端示例

使用 npm、Vite、React 和 TypeScript 的最小前端项目，附带用于观察 BuildKit 缓存的 Dockerfile。

完整教程见 [Docker Buildx 和 BuildKit 前端构建与缓存实战教程](docs/buildkit-tutorial.md)，包含概念图、构建命令、两层缓存、断网验证和日志排查。

本次问答见教程第 14 节「本次问答与缓存实验」，包含跨 RUN、跨阶段、跨 build 的验证命令，以及 `cat` 没打印、`ROUND=2` 命中旧缓存、文档变化触发前端重新打包和 SHA-256 文件校验的具体说明。

## 本地开发

使用 Node 24；项目提供 `.nvmrc` 和 `.node-version`。

```bash
# 进入项目目录。
cd /Users/yhding/ws/demo/buildkit

# 安装依赖并启动开发服务。
npm install
npm run dev
```

默认访问 `http://localhost:5173`。端口被占用时，以终端显示的地址为准。

```bash
# 检查代码。
npm run lint

# 检查 TypeScript 并构建生产文件，输出到 dist。
npm run build

# 本地预览生产文件。
npm run preview
```

## Docker 构建与运行

以下命令使用前面已创建的 `demo-builder`。若还未创建，先执行：

```bash
# 创建独立的 BuildKit 构建器。
docker buildx create --name demo-builder --driver docker-container
```

```bash
# 在项目目录中构建，并加载最终镜像到当前 Docker Engine。
docker buildx build --builder demo-builder --load --progress=plain -t buildkit-frontend:demo .

# 确认镜像已经加载。
docker images buildkit-frontend:demo

# 启动页面服务，访问 http://localhost:8080；按 Ctrl+C 停止。
docker run --rm -p 8080:80 buildkit-frontend:demo
```

## 观察两层缓存

1. 首次构建会下载 Node、Nginx 基础镜像，并执行依赖安装和页面构建。
2. 原样再次执行构建，已有构建步骤通常显示 `CACHED`。
3. 修改 `src/App.tsx` 再构建：依赖安装步骤仍可复用，源码复制和页面构建重新执行。
4. 验证下载缓存时，需要让安装步骤重新执行，同时保留缓存挂载。不要使用 `--no-cache`：当前 BuildKit 会重置这一步使用的缓存挂载，造成重新下载。

可临时将 `Dockerfile.build` 的安装步骤改为以下内容。命令和网络模式变化会触发重新执行，缓存挂载仍可复用：

```dockerfile
# 禁用安装步骤的网络，通过离线安装成功验证已有下载缓存。
RUN --network=none --mount=type=cache,target=/root/.npm \
    npm ci --offline --no-audit --no-fund --loglevel=http
```

```bash
# 使用普通构建，让改过的安装步骤真正执行；不加 --no-cache。
docker buildx build --builder demo-builder -f Dockerfile.build --progress=plain --output type=local,dest=./dist-docker .
```

如果安装步骤真正执行且断网安装成功，就说明已有缓存足以安装当前依赖。仅看到 `(cache hit)` 不足以证明没有下载：npm 可能先打印缓存读取提示，读取失败后再输出网络请求和 `(cache miss)`。

`/root/.npm` 保存下载包，`/app/node_modules` 保存安装后的依赖。缓存目录不进入最终镜像，最终镜像只包含 Nginx 和静态页面。

下载缓存保存在 builder 本地，可被缓存清理回收；`--cache-to` 和 `--cache-from` 不会导出或恢复 `type=cache` 目录。

## 只构建并导出前端产物

`Dockerfile.build` 专门用于生成静态文件。最后的 `artifact` 阶段只包含 `dist` 内容，导出到本地的 `dist-docker/`。

```bash
# 进入项目目录。
cd /Users/yhding/ws/demo/buildkit

# 使用独立构建器构建，并将静态文件导出到本地目录。
docker buildx build --builder demo-builder -f Dockerfile.build --progress=plain --output type=local,dest=./dist-docker .
```

导出目录中包含 `index.html` 和 `assets/`。这里使用文件输出，因此不会向 `docker images` 添加镜像；需要 Nginx 页面镜像时使用上面的 `Dockerfile` 和 `--load` 命令。
