import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 找到页面挂载节点，节点缺失时给出明确错误。
const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('找不到页面挂载节点 root')
}

// 将 React 应用渲染到挂载节点，严格模式帮助发现开发问题。
createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
