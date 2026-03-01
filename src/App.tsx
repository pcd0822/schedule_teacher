import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Result from './pages/Result'
import Admin from './pages/Admin'
import StudentHome from './pages/StudentHome'
import StudentResult from './pages/StudentResult'
import StudentClassPdf from './pages/StudentClassPdf'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/schedule/:batchId" element={<Home />} />
      <Route path="/schedule/:batchId/result" element={<Result />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/student" element={<StudentHome />} />
      <Route path="/student/result" element={<StudentResult />} />
      <Route path="/student/class-pdf" element={<StudentClassPdf />} />
    </Routes>
  )
}
