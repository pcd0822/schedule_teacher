import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getLatestBatchId, listTeachers } from '../api'
import styles from './Home.module.css'

export default function Home() {
  const { batchId: paramBatchId } = useParams<{ batchId?: string }>()
  const navigate = useNavigate()
  const [batchId, setBatchId] = useState(paramBatchId || '')
  const [name, setName] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [batchLoading, setBatchLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (paramBatchId) {
      setBatchId(paramBatchId)
      setBatchLoading(false)
      return
    }
    getLatestBatchId().then((id) => {
      setBatchId(id || '')
      setBatchLoading(false)
    })
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
      setError('아직 등록된 시간표가 없습니다. 관리자가 엑셀을 업로드하면 검색할 수 있습니다.')
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

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div className={styles.logoWrap}>
          <img
            src="/웃음 자홍이얼굴.jpg"
            alt=""
            className={styles.mascot}
          />
          <h1 className={styles.title}>교사 시간표 조회</h1>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>이름으로 검색</h2>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label>교사 이름</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름 입력"
                list="suggestions"
                autoComplete="off"
                disabled={batchLoading}
              />
              <datalist id="suggestions">
                {suggestions.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            {error && <p className={styles.error}>{error}</p>}
            <button
              type="submit"
              className={styles.btn}
              disabled={loading || batchLoading}
            >
              {loading ? '조회 중…' : batchLoading ? '준비 중…' : '시간표 보기'}
            </button>
          </form>
        </section>
      </main>

      <footer className={styles.footer}>
        <a href="/admin">관리자 페이지</a>
      </footer>
    </div>
  )
}
