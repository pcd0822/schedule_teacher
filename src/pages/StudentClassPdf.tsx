import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { getClassSchedules } from '../api'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import styles from './StudentClassPdf.module.css'

const DAYS = ['월', '화', '수', '목', '금']

function subjectDisplayName(raw: string): string {
  if (!raw || raw === '-') return raw || '-'
  const trimmed = raw.replace(/^[A-Za-z\s]+/, '').trim()
  return trimmed || raw
}

function displaySubject(raw: string): string {
  const name = subjectDisplayName(raw)
  if (name === '공강') return '공강'
  if (name === '동아') return '동아리'
  return name
}

export default function StudentClassPdf() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const grade = parseInt(searchParams.get('grade') || '', 10)
  const classCode = parseInt(searchParams.get('classCode') || '', 10)
  const [data, setData] = useState<{
    students: { studentId: string; studentName: string; schedule: { subject: string; teacher: string; room: string }[][] }[]
    grade: number
    classCode: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pdfDone, setPdfDone] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!grade || !classCode) {
      setError('학년과 반을 선택해 주세요.')
      setLoading(false)
      return
    }
    getClassSchedules(grade, classCode)
      .then(setData)
      .catch((e) => setError(e.message || '조회 실패'))
      .finally(() => setLoading(false))
  }, [grade, classCode])

  useEffect(() => {
    if (!data || !data.students || data.students.length === 0 || !containerRef.current) return

    const run = async () => {
      const container = containerRef.current
      if (!container) return

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const pxToMm = 25.4 / 96

      for (let i = 0; i < data.students.length; i++) {
        const el = container.querySelector(`[data-student-index="${i}"]`) as HTMLElement
        if (!el) continue
        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
        })
        const imgData = canvas.toDataURL('image/png')
        const imgW = canvas.width * pxToMm
        const imgH = canvas.height * pxToMm
        const k = Math.min(pageW / imgW, pageH / imgH) * 0.9
        const drawW = imgW * k
        const drawH = imgH * k
        if (i > 0) pdf.addPage()
        pdf.addImage(imgData, 'PNG', (pageW - drawW) / 2, (pageH - drawH) / 2, drawW, drawH)
      }

      const fileName = `${data.grade}학년_${data.classCode % 100}반_시간표.pdf`
      pdf.save(fileName)
      setPdfDone(true)
    }

    const t = setTimeout(run, 300)
    return () => clearTimeout(t)
  }, [data])

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <p className={styles.loading}>학급 시간표 불러오는 중…</p>
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

  const displayName = `${data.grade}학년 ${data.classCode % 100}반`

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={() => navigate('/student')}>
          ← 뒤로
        </button>
        <h1 className={styles.title}>{displayName} 전체 시간표 PDF 생성</h1>
      </header>

      <main className={styles.main}>
        {!pdfDone ? (
          <p className={styles.status}>PDF 생성 중…</p>
        ) : (
          <p className={styles.status}>다운로드가 완료되었습니다.</p>
        )}

        <div ref={containerRef} className={styles.hiddenSlots} aria-hidden="true">
          {data.students.map((stu, idx) => (
            <div key={`${stu.studentId}-${idx}`} data-student-index={idx} className={styles.schedulePage}>
              <h2 className={styles.pageTitle}>
                {data.grade === 1
                  ? `${stu.studentId} 학생의 시간표`
                  : `${stu.studentId} ${stu.studentName} 학생의 시간표`}
              </h2>
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
                  {stu.schedule.map((row, p) => (
                    <tr key={p}>
                      <td className={styles.periodCell}>{p + 1}교시</td>
                      {row.map((cell, d) => (
                        <td key={d} className={styles.cell}>
                          <div className={styles.cellContent}>
                            <span className={styles.subject}>{displaySubject(cell.subject)}</span>
                            <span className={styles.teacher}>{cell.teacher || ''}</span>
                            {cell.room && cell.room !== '-' ? (
                              <span className={styles.room}>{cell.room}</span>
                            ) : null}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
