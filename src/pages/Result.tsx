import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { searchSchedule } from '../api'
import * as XLSX from 'xlsx'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import styles from './Result.module.css'

const DAYS = ['월', '화', '수', '목', '금']

/** 과목별 시수 합산 시 알파벳 제외한 과목명으로 묶기 위해 사용 (화면 표시는 원문 유지) */
function subjectDisplayNameForStats(raw: string): string {
  if (!raw || raw === '-') return raw || '-'
  const trimmed = raw.replace(/^[A-Za-z\s]+/, '').trim()
  return trimmed || raw
}

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
    department?: string
    subjectArea?: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloadOpen, setDownloadOpen] = useState(false)
  const scheduleSectionRef = useRef<HTMLElement>(null)

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

  const { teacherName, schedule, subjectStats, department, subjectArea } = data

  // 알파벳 제외한 과목명으로 묶어 시수 합산 (예: A사문 2, B사문 2 → 사문 4)
  const aggregatedStats = (() => {
    const map = new Map<string, number>()
    for (const { subject, count } of subjectStats) {
      const name = subjectDisplayNameForStats(subject)
      map.set(name, (map.get(name) ?? 0) + count)
    }
    return Array.from(map.entries(), ([subject, count]) => ({ subject, count }))
  })()

  const handlePrint = () => {
    window.print()
  }

  const fileName = `${teacherName}_시간표`

  const downloadXlsx = () => {
    const headerRow = ['교시', ...DAYS]
    const rows = schedule.map((row, p) => [
      `${p + 1}교시`,
      ...row.map((cell) => `${cell.subject}${cell.room && cell.room !== '-' ? ` (${cell.room})` : ''}`),
    ])
    const ws = XLSX.utils.aoa_to_sheet([headerRow, ...rows])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '시간표')
    XLSX.writeFile(wb, `${fileName}.xlsx`)
    setDownloadOpen(false)
  }

  const downloadImage = async () => {
    const el = scheduleSectionRef.current
    if (!el) return
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
    const link = document.createElement('a')
    link.download = `${fileName}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    setDownloadOpen(false)
  }

  const downloadPdf = async () => {
    const el = scheduleSectionRef.current
    if (!el) return
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const pxToMm = 25.4 / 96
    const imgW = canvas.width * pxToMm
    const imgH = canvas.height * pxToMm
    const k = Math.min(pageW / imgW, pageH / imgH) * 0.95
    const drawW = imgW * k
    const drawH = imgH * k
    pdf.addImage(imgData, 'PNG', (pageW - drawW) / 2, (pageH - drawH) / 2, drawW, drawH)
    pdf.save(`${fileName}.pdf`)
    setDownloadOpen(false)
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
          <div className={styles.titleBlock}>
            <h1 className={styles.title}>{teacherName} 선생님 시간표</h1>
            {(department || subjectArea) && (
              <div className={styles.titleBadges}>
                {department && <span className={styles.titleBadge}>{department}</span>}
                {subjectArea && <span className={styles.titleBadge}>{subjectArea}</span>}
              </div>
            )}
          </div>
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
          <div className={styles.downloadWrap}>
            <button
              type="button"
              className={styles.downloadBtn}
              onClick={() => setDownloadOpen((o) => !o)}
              aria-expanded={downloadOpen}
              aria-haspopup="true"
            >
              ⬇️ 다운로드
            </button>
            {downloadOpen && (
              <>
                <div className={styles.downloadBackdrop} onClick={() => setDownloadOpen(false)} aria-hidden="true" />
                <div className={styles.downloadMenu} role="menu">
                  <button type="button" className={styles.downloadOption} onClick={downloadXlsx} role="menuitem">
                    <span className={styles.downloadIcon} aria-hidden="true">📊</span>
                    <span>Excel (xlsx)</span>
                  </button>
                  <button type="button" className={styles.downloadOption} onClick={downloadImage} role="menuitem">
                    <span className={styles.downloadIcon} aria-hidden="true">🖼️</span>
                    <span>이미지 (PNG)</span>
                  </button>
                  <button type="button" className={styles.downloadOption} onClick={downloadPdf} role="menuitem">
                    <span className={styles.downloadIcon} aria-hidden="true">📄</span>
                    <span>PDF</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <section ref={scheduleSectionRef} className={styles.section + ' ' + styles.noPrint}>
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
                        <span className={styles.subject}>{cell.subject}</span>
                        {cell.room != null && cell.room !== '' && (cell.room === '-' ? (
                          <span className={styles.roomPlain}>-</span>
                        ) : (
                          <span className={styles.room}>{cell.room}</span>
                        ))}
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
                      <span className={styles.printSubject}>{cell.subject}</span>
                      {cell.room != null && cell.room !== '' && (cell.room === '-' ? (
                        <span className={styles.printRoomPlain}>-</span>
                      ) : (
                        <span className={styles.printRoom}>{cell.room}</span>
                      ))}
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
              {aggregatedStats.map(({ subject, count }) => (
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
