import { useState, useRef } from 'react'
import { uploadExcel, uploadStudentExcel } from '../api'
import styles from './Admin.module.css'

type StudentUploadResult = { batchId: string; grade: number; classCount?: number; studentCount?: number } | null

export default function Admin() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ batchId: string; teacherCount: number; teacherNames: string[] } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [studentFiles, setStudentFiles] = useState<Record<1 | 2 | 3, File | null>>({ 1: null, 2: null, 3: null })
  const [studentLoadingGrade, setStudentLoadingGrade] = useState<1 | 2 | 3 | null>(null)
  const [studentError, setStudentError] = useState('')
  const [studentResult, setStudentResult] = useState<StudentUploadResult>(null)
  const studentInputRefs = useRef<Record<1 | 2 | 3, HTMLInputElement | null>>({ 1: null, 2: null, 3: null })

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
  const studentUrl = typeof window !== 'undefined' ? window.location.origin + '/student' : ''

  const handleStudentFileChange = (grade: 1 | 2 | 3) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null
    setStudentFiles((prev) => ({ ...prev, [grade]: f }))
    setStudentError('')
    setStudentResult(null)
  }

  const handleStudentSubmit = async (e: React.FormEvent, grade: 1 | 2 | 3) => {
    e.preventDefault()
    const f = studentFiles[grade]
    if (!f) {
      setStudentError('엑셀 파일을 선택해 주세요.')
      return
    }
    if (!/\.xlsx?$/i.test(f.name)) {
      setStudentError('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.')
      return
    }
    setStudentLoadingGrade(grade)
    setStudentError('')
    setStudentResult(null)
    try {
      const data = await uploadStudentExcel(grade, f)
      setStudentResult(data)
      setStudentFiles((prev) => ({ ...prev, [grade]: null }))
      if (studentInputRefs.current[grade]) (studentInputRefs.current[grade] as HTMLInputElement).value = ''
    } catch (err) {
      setStudentError(err instanceof Error ? err.message : '업로드 실패')
    } finally {
      setStudentLoadingGrade(null)
    }
  }

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

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>학생 시간표 엑셀 업로드</h2>
          <p className={styles.hint}>
            학년별로 구분해 업로드합니다. 1학년·2학년·3학년 형식이 다르므로 각각 해당 학년용 엑셀을 선택한 뒤 업로드하세요.
          </p>

          {([1, 2, 3] as const).map((grade) => (
            <div key={grade} className={styles.studentUploadBlock}>
              <h3 className={styles.studentGradeTitle}>{grade}학년 시간표</h3>
              <form onSubmit={(e) => handleStudentSubmit(e, grade)} className={styles.form}>
                <div className={styles.field}>
                  <input
                    ref={(el) => { studentInputRefs.current[grade] = el }}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleStudentFileChange(grade)}
                    className={styles.fileInput}
                  />
                  <button
                    type="button"
                    className={styles.fileBtn}
                    onClick={() => studentInputRefs.current[grade]?.click()}
                  >
                    파일 선택
                  </button>
                  {studentFiles[grade] && <span className={styles.fileName}>{studentFiles[grade]!.name}</span>}
                </div>
                {studentError && <p className={styles.error}>{studentError}</p>}
                <button
                  type="submit"
                  className={styles.btn}
                  disabled={studentLoadingGrade !== null}
                >
                  {studentLoadingGrade === grade ? '업로드 중…' : `${grade}학년 업로드`}
                </button>
              </form>
            </div>
          ))}

          {studentResult && (
            <div className={styles.studentResult}>
              <p className={styles.teacherCount}>
                {studentResult.grade}학년 <strong>{studentResult.classCount ?? studentResult.studentCount ?? 0}</strong>
                {studentResult.grade === 1 ? '개 학급' : '명'} 저장되었습니다.
              </p>
            </div>
          )}

          <div className={styles.linkBox}>
            <label>학생에게 공유할 주소 (학번으로 시간표 조회)</label>
            <input
              type="text"
              readOnly
              value={studentUrl}
              className={styles.linkInput}
              onFocus={(e) => e.target.select()}
            />
            <button
              type="button"
              className={styles.copyBtn}
              onClick={() => {
                navigator.clipboard.writeText(studentUrl)
                alert('주소가 복사되었습니다.')
              }}
            >
              주소 복사
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
