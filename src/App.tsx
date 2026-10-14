import { useState } from 'react'
import './App.css'

// 首页组件：通过计数器验证 React 交互和开发时热更新。
function App() {
  // 保存当前点击次数；setCount 用于更新界面状态。
  const [count, setCount] = useState(0)

  // 在上一次计数的基础上加一，确保连续点击时状态正确。
  function handleIncrement() {
    setCount((previousCount) => previousCount + 1)
  }

  return (
    <main className="welcome">
      <p className="eyebrow">Vite · React · TypeScript</p>
      <h1>前端项目已就绪</h1>
      <p>修改 src/App.tsx 并保存，即可看到页面自动更新。</p>
      <button type="button" onClick={handleIncrement}>
        已点击 {count} 次
      </button>
    </main>
  )
}

export default App
