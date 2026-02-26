import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { listTeachers } from '../api'
import styles from './Home.module.css'

const DAYS = ['월', '화', '수', '목', '금']

export default function Home() {
  const { batchId: paramBatchId } = useParams<{ batchId?: string }>()
  const navigate = useNavigate()
  const [batchId, setBatchId] = useState(paramBatchId || '')
  const [name, setName] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (paramBatchId) setBatchId(paramBatchId)
  }, [paramBatchId])

  useEffect(() => {
    if (!batchId.trim()) {
      setSuggestions([])
      return
    }
    let cancelled = false
    listTeachers(batchId.trim())
      .then((r) => {
        if (!cancelled) setSuggestions(r.teacherNames || [])
      })
      .catch(() => {
        if (!cancelled) setSuggestions([])
      })
    return () => { cancelled = true }
  }, [batchId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const bid = batchId.trim()
    const n = name.trim()
    if (!bid) {
      setError('조회 링크가 없습니다. 관리자에게 배포된 링크를 받아 입력해 주세요.')
      return
    }
    if (!n) {
      setError('이름을 입력해 주세요.')
      return
    }
    setLoading(true)
    navigate(`/schedule/${encodeURIComponent(bid)}/result?name=${encodeURIComponent(n)}`)
    setLoading(false)
  }

  const shareUrl = batchId
    ? `${window.location.origin}/schedule/${encodeURIComponent(batchId)}`
    : ''

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div className={styles.logoWrap}>
          <span className={styles.logoIcon}>📋</span>
          <h1 className={styles.title}>교사 시간표 조회</h1>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>이름으로 검색</h2>
          <form onSubmit={handleSubmit} className={styles.form}>
            {!paramBatchId && (
              <div className={styles.field}>
                <label>조회 링크용 배치 ID</label>
                <input
                  type="text"
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  placeholder="예: b_xxxxx"
                />
              </div>
            )}
            <div className={styles.field}>
              <label>교사 이름</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름 입력"
                list="suggestions"
                autoComplete="off"
              />
              <datalist id="suggestions">
                {suggestions.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            {error && <p className={styles.error}>{error}</p>}
            <button type="submit" className={styles.btn} disabled={loading}>
              {loading ? '조회 중…' : '시간표 보기'}
            </button>
          </form>
          {shareUrl && (
            <p className={styles.shareUrl}>
              이 링크로 공유: <a href={shareUrl} target="_blank" rel="noopener noreferrer">{shareUrl}</a>
            </p>
          )}
        </section>
      </main>

      <footer className={styles.footer}>
        <a href="/admin">관리자 페이지</a>
      </footer>
    </div>
  )
}
