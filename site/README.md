# BuildKit HTML 课程站

这是纯静态站点，首页为 `index.html`，课程正文已预生成，不需要 React、Vite、服务端或运行时 Markdown 解析。原始教程仍在 `docs/buildkit-tutorial.md`。

## 更新内容

在仓库根目录执行（Node 24）：

```shell
# 从原教程重新生成课程，不需要安装站点依赖。
node scripts/build-site.mjs

# 启动仅限本机的静态预览服务。
python3 -m http.server 8765 --bind 127.0.0.1 --directory site
```

打开 http://127.0.0.1:8765 。也可以直接打开 `site/index.html` 阅读正文；Mermaid 图表通过固定版本 CDN 渐进加载，需要网络，加载失败时保留图表源码。阅读状态只保存在当前浏览器，不发送到服务器。

当前生成器将长章节按三级标题拆成课程，保留代码、表格、问答和复盘。它会将案例中的本机路径和部分内部域名替换为通用示例；发布前仍应人工检查公开内容是否符合要求。页面按课程标题搜索，不是全文搜索。

## GitHub Pages

部署目录是整个 `site/`。所有页面链接和样式资源使用相对路径，适用于仓库路径 `/buildkit/`。部署工作流为 `.github/workflows/pages.yml`，教程、生成脚本或站点资源推送到 main 后会自动运行，也支持手动触发。

在 GitHub 仓库 Settings → Pages 中将 Source 设为 GitHub Actions。工作流使用 Node 24 生成课程，将 `site/` 上传为 Pages artifact，再通过 deploy-pages 发布。无需安装 npm 依赖。预计地址为 https://dddddd889.github.io/buildkit/；是否发布成功应以 Actions 终态和实际页面为准。

`site/vendor/marked.mjs` 是生成器使用的 Marked 14.0.0，许可证见同目录 `marked-LICENSE.md`；浏览器不会加载这个 Markdown 解析库。
