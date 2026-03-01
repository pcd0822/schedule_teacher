import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Result from './pages/Result'
import Admin from './pages/Admin'
import StudentHome from './pages/StudentHome'
import StudentResult from './pages/StudentResult'
import StudentClassPdf from './pages/StudentClassPdf'

const TAB_TITLE = '속초여자고등학교 시간표 검색'

function AppRoutes() {
  const location = useLocation()
  useEffect(() => {
    document.title = TAB_TITLE
  }, [location.pathname])

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

export default function App() {
  return <AppRoutes />
}
