import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// 启用 React 插件，支持 TSX 编译和开发时热更新。
export default defineConfig({
  plugins: [react()],
})
