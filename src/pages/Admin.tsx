import { useState, useRef } from 'react'
import { uploadExcel } from '../api'
import styles from './Admin.module.css'

export default function Admin() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ batchId: string; teacherCount: number; teacherNames: string[] } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    setFile(f || null)
    setError('')
    setResult(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError('엑셀 파일을 선택해 주세요.')
      return
    }
    if (!/\.xlsx?$/i.test(file.name)) {
      setError('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.')
      return
    }
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const data = await uploadExcel(file)
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드 실패')
    } finally {
      setLoading(false)
    }
  }

  const shareUrl = result
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/schedule/${encodeURIComponent(result.batchId)}`
    : ''

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <a href="/" className={styles.homeLink}>← 홈</a>
        <h1 className={styles.title}>관리자 · 엑셀 업로드</h1>
      </header>

      <main className={styles.main}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>교사 시간표 엑셀 업로드</h2>
          <p className={styles.hint}>
            규칙에 따라 작성된 교사 개인 시간표 엑셀을 업로드하면, 교사별 조회 링크를 생성할 수 있습니다.
          </p>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className={styles.fileInput}
              />
              <button
                type="button"
                className={styles.fileBtn}
                onClick={() => inputRef.current?.click()}
              >
                파일 선택
              </button>
              {file && <span className={styles.fileName}>{file.name}</span>}
            </div>
            {error && <p className={styles.error}>{error}</p>}
            <button type="submit" className={styles.btn} disabled={loading}>
              {loading ? '업로드 중…' : '업로드 후 링크 생성'}
            </button>
          </form>
        </section>

        {result && (
          <section className={styles.card + ' ' + styles.resultCard}>
            <h2 className={styles.cardTitle}>조회 링크 생성 완료</h2>
            <p className={styles.teacherCount}>
              교사 <strong>{result.teacherCount}</strong>명 등록됨
            </p>
            <div className={styles.linkBox}>
              <label>아래 링크를 교사에게 공유하세요.</label>
              <input
                type="text"
                readOnly
                value={shareUrl}
                className={styles.linkInput}
                onFocus={(e) => e.target.select()}
              />
              <button
                type="button"
                className={styles.copyBtn}
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl)
                  alert('링크가 복사되었습니다.')
                }}
              >
                링크 복사
              </button>
            </div>
            <details className={styles.details}>
              <summary>등록된 교사 목록 ({result.teacherNames.length}명)</summary>
              <ul className={styles.teacherList}>
                {result.teacherNames.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </details>
          </section>
        )}
      </main>
    </div>
  )
}
