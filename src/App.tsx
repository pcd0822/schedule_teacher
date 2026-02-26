import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Result from './pages/Result'
import Admin from './pages/Admin'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/schedule/:batchId" element={<Home />} />
      <Route path="/schedule/:batchId/result" element={<Result />} />
      <Route path="/admin" element={<Admin />} />
    </Routes>
  )
}
