// 阅读状态只保存在当前浏览器，禁用存储时仍能正常阅读。
const storageKey = 'buildkit-read-v1';
let read = [];
try { read = JSON.parse(localStorage.getItem(storageKey) || '[]'); if (!Array.isArray(read)) read = []; } catch {}
function refreshProgress() {
 document.querySelectorAll('.card[data-lesson]').forEach(card => card.classList.toggle('read', read.includes(card.dataset.lesson)));
 const count = document.querySelector('#read-count');
 if (count) count.textContent = `已读 ${read.length} 课 · 进度保存在当前浏览器`;
 const complete = document.querySelector('#complete');
 if (complete) complete.textContent = read.includes(complete.dataset.lesson) ? '✓ 已读 · 点击取消' : '标记为已读';
}
refreshProgress();
document.querySelector('#complete')?.addEventListener('click', event => {
 const id = event.currentTarget.dataset.lesson;
 read = read.includes(id) ? read.filter(item => item !== id) : [...read, id];
 try { localStorage.setItem(storageKey, JSON.stringify(read)); } catch {}
 refreshProgress();
});
// 目录按课程标题检索，不隐藏正文。
document.querySelector('#search')?.addEventListener('input', event => {
 const query = event.target.value.trim().toLowerCase();
 let matches = 0;
 document.querySelectorAll('.lesson-link').forEach(link => { link.hidden = !link.textContent.toLowerCase().includes(query); if (!link.hidden) matches++; });
 document.querySelector('#empty').hidden = matches !== 0;
});
document.querySelector('.menu')?.addEventListener('click', event => {
 const open = document.body.classList.toggle('nav-open');
 event.currentTarget.setAttribute('aria-expanded', String(open));
});
// 支持 HTTPS、localhost 和直接打开文件时的代码复制。
for (const block of document.querySelectorAll('pre:not(.mermaid)')) {
 const code = block.querySelector('code');
 if (!code) continue;
 const button = document.createElement('button');
 button.type = 'button'; button.className = 'copy'; button.textContent = '复制代码';
 button.addEventListener('click', async () => {
  try {
   if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(code.textContent);
   else {
    const field = document.createElement('textarea'); field.value = code.textContent;
    field.style.position = 'fixed'; field.style.opacity = '0'; document.body.append(field); field.select();
    const copied = document.execCommand('copy'); field.remove(); if (!copied) throw new Error('copy');
   }
   button.textContent = '已复制';
  } catch { button.textContent = '请选中代码复制'; }
  setTimeout(() => { button.textContent = '复制代码'; }, 2000);
 });
 block.append(button);
}
// Mermaid 是渐进增强：加载失败时保留可读源码，其余课程无需网络。
if (document.querySelector('.mermaid')) {
 import('https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.esm.min.mjs').then(async ({default: mermaid}) => {
  mermaid.initialize({startOnLoad:false,securityLevel:'strict',theme:'neutral'});
  await mermaid.run({querySelector:'.mermaid'});
 }).catch(() => {});
}
