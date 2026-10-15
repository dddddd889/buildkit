import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from '../site/vendor/marked.mjs';

// 从同一份教程生成独立课程页，避免同时维护两份正文。
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = process.env.SITE_SOURCE || path.join(root, 'docs/buildkit-tutorial.md');
const output = path.join(root, 'site');
const raw = await fs.readFile(source, 'utf8');
const tokens = marked.lexer(raw);
const sections = [];
let section;
for (const token of tokens) {
  if (token.type === 'heading' && token.depth === 2) {
    section = { title: token.text.replace(/^\d+\s*/, ''), tokens: [] };
    sections.push(section);
  } else if (section) section.tokens.push(token);
}
// 长章节按三级标题拆课；普通章节保持上下文完整。
const lessons = [];
for (const [index, item] of sections.entries()) {
  const group = index < 5 ? '开始构建' : index < 14 ? '看懂本地缓存' : index < 23 ? '远端缓存与 CI' : '问答与自测';
  const long = item.tokens.map(t => t.raw).join('').length > 2600 && item.tokens.some(t => t.type === 'heading' && t.depth === 3);
  if (!long) { lessons.push({ title: item.title, group, body: item.tokens.map(t => t.raw).join('') }); continue; }
  let intro = '', current;
  for (const token of item.tokens) {
    if (token.type === 'heading' && token.depth === 3) {
      current = { title: token.text.replace(/^\d+\.\d+\s*/, ''), group, parent: item.title, body: intro };
      intro = '';
      lessons.push(current);
    } else if (current) current.body += token.raw;
    else intro += token.raw;
  }
}
// 公开站点使用通用示例域名和路径，原始内部案例仍留在教程中。
const publicText = text => text
  .replace(/docker-(?:register-)?registry[^\s/"'<>]*\.cr\.aliyuncs\.com/g, 'registry.example.com')
  .replace(/https?:\/\/g\.echo\.tech/g, 'https://gitlab.example.com')
  .replace(/g\.echo\.tech/g, 'gitlab.example.com')
  .replace(/\/Users\/yhding\/ws\/demo\/buildkit/g, '/workspace/buildkit')
  .replace(/\/Users\/yhding[^\s`"<>)]*/g, '/workspace/project');
const escape = text => text.replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
for (const [index, lesson] of lessons.entries()) {
  lesson.id = `lesson-${String(index + 1).padStart(2, '0')}`;
  lesson.title = publicText(lesson.title);
  lesson.body = publicText(lesson.body);
  lesson.minutes = Math.max(2, Math.ceil(lesson.body.length / 650));
}
const sidebar = active => {
 let previous = '';
 return lessons.map((lesson, i) => {
  const heading = lesson.group !== previous ? `<p class="nav-group">${lesson.group}</p>` : '';
  previous = lesson.group;
  return `${heading}<a class="lesson-link ${lesson.id === active ? 'active' : ''}" ${lesson.id === active ? 'aria-current="page"' : ''} href="${lesson.id}.html"><span>${String(i + 1).padStart(2,'0')}</span>${escape(lesson.title)}</a>`;
 }).join('');
};
const shell = (title, active, main) => `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="用实际命令学懂 Docker BuildKit、层缓存、下载缓存与 CI。"><title>${escape(title)} · BuildKit 学习手册</title><link rel="stylesheet" href="assets/style.css"></head>
<body><a class="skip" href="#main">跳到正文</a><header><a class="brand" href="index.html"><span class="brand-icon">B</span>BuildKit <span class="muted">学习手册</span></a><button class="menu" type="button" aria-expanded="false" aria-controls="sidebar">课程目录</button><a class="header-link" href="index.html">全部课程 ↗</a></header><div class="layout"><aside id="sidebar"><label for="search">查找课程</label><input id="search" type="search" placeholder="例如：下载缓存、GitLab"><nav aria-label="课程目录">${sidebar(active)}</nav><p id="empty" hidden>没有匹配课程</p></aside><main id="main">${main}<footer>BuildKit 学习手册 · 静态 HTML · 示例中的仓库与路径请替换为自己的配置</footer></main></div><script src="assets/app.js" defer></script></body></html>`;
await fs.mkdir(path.join(output, 'assets'), { recursive: true });
// 只删除生成器负责的旧课程文件，保留其他资源。
for (const file of await fs.readdir(output)) if (/^lesson-\d+\.html$/.test(file)) await fs.unlink(path.join(output,file));
for (const [index, lesson] of lessons.entries()) {
 const headings = [];
 const renderer = new marked.Renderer();
 renderer.heading = ({tokens, depth}) => {
  const text = marked.Parser.parseInline(tokens);
  const id = `section-${headings.length + 1}`;
  headings.push({id,text});
  return `<h${Math.max(2,depth)} id="${id}">${text}</h${Math.max(2,depth)}>`;
 };
 renderer.code = ({text,lang}) => lang === 'mermaid'
  ? `<figure class="diagram"><pre class="mermaid">${escape(text)}</pre><details><summary>查看图表源码</summary><pre><code>${escape(text)}</code></pre></details></figure>`
  : `<pre><code class="language-${escape((lang||'text').split(' ')[0])}">${escape(text)}</code></pre>`;
 const html = marked.parse(lesson.body, {renderer});
 const prev = lessons[index-1], next = lessons[index+1];
 const toc = headings.length > 1 ? `<details class="toc" open><summary>本课内容</summary>${headings.map(h=>`<a href="#${h.id}">${h.text}</a>`).join('')}</details>` : '';
 const main = `<div class="eyebrow">${lesson.group} / 第 ${index+1} 课</div><h1>${escape(lesson.title)}</h1><p class="meta">${lesson.minutes} 分钟阅读${lesson.parent ? ` · ${escape(lesson.parent)}` : ''}</p><div class="progress"><span style="width:${(index+1)/lessons.length*100}%"></span></div>${toc}<article>${html}</article><div class="lesson-bottom"><button id="complete" data-lesson="${lesson.id}" type="button">标记为已读</button><span>${index+1} / ${lessons.length} 课</span></div><div class="pager">${prev?`<a href="${prev.id}.html"><small>← 上一课</small>${escape(prev.title)}</a>`:'<span></span>'}${next?`<a href="${next.id}.html"><small>下一课 →</small>${escape(next.title)}</a>`:'<a href="index.html">返回全部课程 →</a>'}</div>`;
 await fs.writeFile(path.join(output,`${lesson.id}.html`), shell(lesson.title,lesson.id,main));
}
let previous = '';
const cards = lessons.map((l,i)=> {
 const groupTitle = previous !== l.group ? `<h2 class="course-group">${l.group}</h2>` : '';
 previous = l.group;
 return `${groupTitle}<a class="card" href="${l.id}.html" data-lesson="${l.id}"><span class="card-number">${String(i+1).padStart(2,'0')}</span><div><h3>${escape(l.title)}</h3><p>${l.minutes} 分钟${l.parent?' · '+escape(l.parent):''}</p></div><span class="arrow">↗</span></a>`;
}).join('');
await fs.writeFile(path.join(output,'index.html'),shell('从一次构建，学懂缓存','',`<div class="eyebrow">动手理解 / DOCKER BUILDKIT</div><h1 class="hero">从一次构建，<br>学懂<span>缓存。</span></h1><p class="lead">不只记住 CACHED。分清步骤结果、下载目录和 builder，再把它们用到本地实验与 CI。</p><div class="stats"><div><strong>${lessons.length}</strong><span>节短课</span></div><div><strong>3</strong><span>个核心概念</span></div><div><strong>5</strong><span>道自测复盘</span></div></div><div class="home-actions"><a class="primary" href="${lessons[0].id}.html">从第一课开始 →</a><span id="read-count">阅读进度保存在当前浏览器</span></div><div class="note">学习顺序：先理解谁在构建，再观察什么被缓存，最后验证跨 builder 复用。公司案例已替换为示例地址，不能直接当作部署配置。</div><section class="courses">${cards}</section>`));
await fs.writeFile(path.join(output,'lessons.json'),JSON.stringify(lessons.map(({body,...rest})=>rest),null,2));
await fs.writeFile(path.join(output,'.nojekyll'),'');
console.log(`生成 ${lessons.length} 节课，输出目录：${output}`);
