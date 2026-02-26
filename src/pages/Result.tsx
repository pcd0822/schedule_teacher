import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { searchSchedule } from '../api'
import styles from './Result.module.css'

const DAYS = ['월', '화', '수', '목', '금']

export default function Result() {
  const { batchId } = useParams<{ batchId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const name = searchParams.get('name') || ''
  const [data, setData] = useState<{
    teacherName: string
    schedule: { subject: string; room: string }[][]
    subjectStats: { subject: string; count: number }[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!batchId || !name) {
      setError('이름 또는 배치 정보가 없습니다.')
      setLoading(false)
      return
    }
    searchSchedule(batchId, name)
      .then(setData)
      .catch((e) => setError(e.message || '조회 실패'))
      .finally(() => setLoading(false))
  }, [batchId, name])

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
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => navigate(batchId ? `/schedule/${batchId}` : '/')}
          >
            뒤로
          </button>
        </div>
      </div>
    )
  }

  const { teacherName, schedule, subjectStats } = data

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate(batchId ? `/schedule/${batchId}` : '/')}
        >
          ← 뒤로
        </button>
        <h1 className={styles.title}>{teacherName} 선생님 시간표</h1>
      </header>

      <main className={styles.main}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>시간표</h2>
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
                        <span className={styles.subject}>{cell.subject || '-'}</span>
                        {cell.room && <span className={styles.room}>{cell.room}</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>과목별 시수</h2>
          <table className={styles.statsTable}>
            <thead>
              <tr>
                <th>과목</th>
                <th>시수</th>
              </tr>
            </thead>
            <tbody>
              {subjectStats.map(({ subject, count }) => (
                <tr key={subject}>
                  <td>{subject}</td>
                  <td>{count}시간</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  )
}
