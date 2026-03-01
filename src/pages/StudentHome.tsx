import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStudentClasses } from '../api'
import styles from './StudentHome.module.css'

export default function StudentHome() {
  const navigate = useNavigate()
  const [studentId, setStudentId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [classModalOpen, setClassModalOpen] = useState(false)
  const [classGrade, setClassGrade] = useState<1 | 2 | 3>(1)
  const [classCode, setClassCode] = useState('')
  const [classOptions, setClassOptions] = useState<{ classCode: number; displayName: string }[]>([])
  const [classOptionsLoading, setClassOptionsLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const id = studentId.trim().replace(/\D/g, '')
    if (!id) {
      setError('학번을 입력해 주세요.')
      return
    }
    setLoading(true)
    navigate(`/student/result?studentId=${encodeURIComponent(id)}`)
    setLoading(false)
  }

  const handleOpenClassModal = () => {
    setClassModalOpen(true)
    setClassOptions([])
    setClassCode('')
    setClassGrade(1)
    setClassOptionsLoading(true)
    getStudentClasses(1)
      .then((data) => setClassOptions(data.classes || []))
      .catch(() => setClassOptions([]))
      .finally(() => setClassOptionsLoading(false))
  }

  const handleGradeChange = (grade: 1 | 2 | 3) => {
    setClassGrade(grade)
    setClassOptionsLoading(true)
    getStudentClasses(grade)
      .then((data) => setClassOptions(data.classes || []))
      .catch(() => setClassOptions([]))
      .finally(() => setClassOptionsLoading(false))
    setClassCode('')
  }

  const handleExportClassPdf = () => {
    const code = parseInt(classCode, 10)
    if (!classCode || isNaN(code)) return
    setClassModalOpen(false)
    navigate(`/student/class-pdf?grade=${classGrade}&classCode=${code}`)
  }

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div className={styles.logoWrap}>
          <img src="/웃음 자홍이얼굴.jpg" alt="" className={styles.mascot} />
          <h1 className={styles.title}>학생 시간표 조회</h1>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>학번으로 검색</h2>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label>학번</label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="예: 10101, 30105"
                autoComplete="off"
                maxLength={10}
              />
            </div>
            {error && <p className={styles.error}>{error}</p>}
            <button type="submit" className={styles.btn} disabled={loading}>
              {loading ? '조회 중…' : '시간표 보기'}
            </button>
          </form>

          <div className={styles.classExport}>
            <button
              type="button"
              className={styles.classExportBtn}
              onClick={handleOpenClassModal}
            >
              학급 전체 출력
            </button>
          </div>
        </section>
      </main>

      {classModalOpen && (
        <>
          <div className={styles.modalBackdrop} onClick={() => setClassModalOpen(false)} />
          <div className={styles.modal} role="dialog" aria-modal="true">
            <h3 className={styles.modalTitle}>학급 선택</h3>
            <div className={styles.modalField}>
              <label>학년</label>
              <select
                value={classGrade}
                onChange={(e) => handleGradeChange(parseInt(e.target.value, 10) as 1 | 2 | 3)}
              >
                <option value={1}>1학년</option>
                <option value={2}>2학년</option>
                <option value={3}>3학년</option>
              </select>
            </div>
            <div className={styles.modalField}>
              <label>반</label>
              <select
                value={classCode}
                onChange={(e) => setClassCode(e.target.value)}
                disabled={classOptionsLoading}
              >
                <option value="">반 선택</option>
                {classOptions.map((c) => (
                  <option key={c.classCode} value={c.classCode}>
                    {c.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.modalCancel} onClick={() => setClassModalOpen(false)}>
                취소
              </button>
              <button
                type="button"
                className={styles.modalConfirm}
                onClick={handleExportClassPdf}
                disabled={!classCode}
              >
                PDF 출력
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
