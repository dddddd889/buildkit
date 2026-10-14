# BuildKit 前端示例

使用 npm、Vite、React 和 TypeScript 的最小前端项目，附带用于观察 BuildKit 缓存的 Dockerfile。

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
4. 加入 `--no-cache` 可让构建步骤重新执行；已有的 npm 下载缓存目录仍可复用。

```bash
# 忽略构建步骤缓存，观察 npm ci 重新执行时对下载缓存的复用。
docker buildx build --builder demo-builder --load --no-cache --progress=plain -t buildkit-frontend:demo .
```

`/root/.npm` 保存下载包，`/app/node_modules` 保存安装后的依赖。缓存目录不进入最终镜像，最终镜像只包含 Nginx 和静态页面。

下载缓存保存在 builder 本地，可被缓存清理回收；`--cache-to` 和 `--cache-from` 不会导出或恢复 `type=cache` 目录。
