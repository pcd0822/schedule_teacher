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

  const mainUrl = typeof window !== 'undefined' ? window.location.origin + '/' : ''

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <a href="/" className={styles.homeLink}>← 홈</a>
        <div className={styles.headerTitleWrap}>
          <img src="/웃음 자홍이얼굴.jpg" alt="" className={styles.mascot} />
          <h1 className={styles.title}>관리자 · 엑셀 업로드</h1>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>교사 시간표 엑셀 업로드</h2>
          <p className={styles.hint}>
            규칙에 따라 작성된 교사 개인 시간표 엑셀을 업로드하면, 곧바로 메인 페이지에서 이름만 입력해 조회할 수 있습니다. 별도 링크 생성 없이 이 사이트 주소만 공유하면 됩니다.
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
              {loading ? '업로드 중…' : '업로드'}
            </button>
          </form>
        </section>

        {result && (
          <section className={styles.card + ' ' + styles.resultCard}>
            <h2 className={styles.cardTitle}>업로드 완료</h2>
            <p className={styles.teacherCount}>
              교사 <strong>{result.teacherCount}</strong>명이 저장되었습니다. 메인 페이지에서 이름만 입력하면 바로 조회됩니다.
            </p>
            <div className={styles.linkBox}>
              <label>교사에게 공유할 주소 (이 링크만 알려주면 됩니다)</label>
              <input
                type="text"
                readOnly
                value={mainUrl}
                className={styles.linkInput}
                onFocus={(e) => e.target.select()}
              />
              <button
                type="button"
                className={styles.copyBtn}
                onClick={() => {
                  navigator.clipboard.writeText(mainUrl)
                  alert('주소가 복사되었습니다.')
                }}
              >
                주소 복사
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
