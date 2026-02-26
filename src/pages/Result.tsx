import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { searchSchedule } from '../api'
import styles from './Result.module.css'

const DAYS = ['월', '화', '수', '목', '금']

export type PrintSize = 'small' | 'medium' | 'large' | 'xlarge'

export default function Result() {
  const { batchId } = useParams<{ batchId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const name = searchParams.get('name') || ''
  const [printSize, setPrintSize] = useState<PrintSize>('medium')
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

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className={styles.wrapper}>
      <header className={styles.header + ' ' + styles.noPrint}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate(batchId ? `/schedule/${batchId}` : '/')}
        >
          ← 뒤로
        </button>
        <div className={styles.headerTitleWrap}>
          <img src="/웃음 자홍이얼굴.jpg" alt="" className={styles.mascot} />
          <h1 className={styles.title}>{teacherName} 선생님 시간표</h1>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.printControls + ' ' + styles.noPrint}>
          <span className={styles.printLabel}>인쇄 크기</span>
          <div className={styles.printSizeOptions}>
            {(['small', 'medium', 'large', 'xlarge'] as const).map((size) => (
              <label key={size} className={styles.printSizeLabel}>
                <input
                  type="radio"
                  name="printSize"
                  checked={printSize === size}
                  onChange={() => setPrintSize(size)}
                />
                <span>
                  {size === 'small' && '작게'}
                  {size === 'medium' && '보통'}
                  {size === 'large' && '크게'}
                  {size === 'xlarge' && '매우 크게'}
                </span>
              </label>
            ))}
          </div>
          <button type="button" className={styles.printBtn} onClick={handlePrint}>
            🖨️ 인쇄
          </button>
        </div>

        <section className={styles.section + ' ' + styles.noPrint}>
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

        {/* 인쇄 시 이 영역만 출력됨 */}
        <div
          className={styles.printOnly + ' ' + styles.printArea + ' ' + styles[`printSize_${printSize}`]}
          aria-hidden="true"
        >
          <h1 className={styles.printTitle}>{teacherName} 선생님 시간표</h1>
          <table className={styles.printTable}>
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
                  <td className={styles.printPeriodCell}>{p + 1}교시</td>
                  {row.map((cell, d) => (
                    <td key={d}>
                      <span className={styles.printSubject}>{cell.subject || '-'}</span>
                      {cell.room && <span className={styles.printRoom}>{cell.room}</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className={styles.section + ' ' + styles.noPrint}>
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
