import { Routes, Route } from 'react-router'
import Home from './pages/Home'

export default function App() {
  return (
    <Routes>
      {/* file:// 协议下 pathname 是完整文件路径，用 * 兜底保证单文件双击可开 */}
      <Route path="*" element={<Home />} />
    </Routes>
  )
}
