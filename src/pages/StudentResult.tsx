import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { searchStudent } from '../api'
import html2canvas from 'html2canvas'
import styles from './StudentResult.module.css'

const DAYS = ['월', '화', '수', '목', '금']
const SPECIAL_NOTE_LETTERS = ['L', 'K', 'J', 'M']

function subjectDisplayName(raw: string): string {
  if (!raw || raw === '-') return raw || '-'
  const trimmed = raw.replace(/^[A-Za-z\s]+/, '').trim()
  return trimmed || raw
}

function displaySubject(raw: string): string {
  const trimmed = (raw || '').trim()
  if (trimmed === '공강') return '공강'
  if (trimmed === '동아') return '동아리'
  if (['L', 'K', 'J', 'M'].includes(trimmed.toUpperCase())) return trimmed.toUpperCase()
  return subjectDisplayName(raw)
}

function needsSpecialNote(schedule: { subject: string; teacher: string; room: string }[][]): boolean {
  for (const row of schedule) {
    for (const cell of row) {
      const s = (cell.subject || '').trim().toUpperCase()
      if (SPECIAL_NOTE_LETTERS.some((c) => s === c)) return true
    }
  }
  return false
}

export default function StudentResult() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const studentIdParam = searchParams.get('studentId') || ''
  const [data, setData] = useState<{
    studentId: string
    studentName: string
    grade: number
    schedule: { subject: string; teacher: string; room: string }[][]
    homeroomTeacher?: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const scheduleSectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!studentIdParam.trim()) {
      setError('학번을 입력해 주세요.')
      setLoading(false)
      return
    }
    searchStudent(studentIdParam)
      .then(setData)
      .catch((e) => setError(e.message || '조회 실패'))
      .finally(() => setLoading(false))
  }, [studentIdParam])

  const handleDownloadImage = async () => {
    const el = scheduleSectionRef.current
    if (!el) return
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
    const link = document.createElement('a')
    const fileName = data?.grade === 1
      ? `${data?.studentId || '학생'}_시간표`
      : `${data?.studentId || '학생'}_${data?.studentName || ''}_시간표`
    link.download = fileName.replace(/\s/g, '_') + '.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <p className={styles.loading}>불러오는 중…</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <p className={styles.error}>{error || '데이터가 없습니다.'}</p>
          <button type="button" className={styles.btnSecondary} onClick={() => navigate('/student')}>
            뒤로
          </button>
        </div>
      </div>
    )
  }

  const { studentId, studentName, grade, schedule, homeroomTeacher } = data
  const showSpecialNote = needsSpecialNote(schedule)
  const pageTitle = grade === 1 ? `${studentId} 학생의 시간표` : `${studentId} ${studentName} 학생의 시간표`

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={() => navigate('/student')}>
          ← 뒤로
        </button>
        <div className={styles.headerTitleWrap}>
          <img src="/웃음 자홍이얼굴.jpg" alt="" className={styles.mascot} />
          <h1 className={styles.title}>{pageTitle}</h1>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.downloadRow}>
          <button type="button" className={styles.downloadBtn} onClick={handleDownloadImage}>
            🖼️ 이미지로 저장
          </button>
        </div>

        <section ref={scheduleSectionRef} className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{pageTitle}</h2>
            {homeroomTeacher && (
              <span className={styles.homeroom}>
                담임선생님: {homeroomTeacher.includes('선생님') ? homeroomTeacher : `${homeroomTeacher}선생님`}
              </span>
            )}
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>교시</th>
                  {DAYS.map((d) => (
                    <th key={d}>{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {schedule.map((row, p) => (
                  <tr key={p}>
                    <td className={styles.periodCell}>{p + 1}교시</td>
                    {row.map((cell, d) => (
                      <td key={d} className={styles.cell}>
                        <div className={styles.cellContent}>
                          <span className={styles.subject}>{displaySubject(cell.subject)}</span>
                          <span className={styles.teacher}>{cell.teacher || ''}</span>
                          {cell.room != null && cell.room !== '' && cell.room !== '-' ? (
                            <span className={styles.room}>{cell.room}</span>
                          ) : cell.room === '-' ? (
                            <span className={styles.roomPlain}>-</span>
                          ) : null}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {showSpecialNote && (
            <p className={styles.specialNote}>
              L, K, J, M타임 공란입니다. 반드시 앱인 어플 개별 확인 하세요.
            </p>
          )}
        </section>
      </main>
    </div>
  )
}
