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

  // 입력과 일치하는 이름만 필터 후 철자 순 정렬
  const searchLower = name.trim().toLowerCase()
  const matchedNames = searchLower
    ? [...suggestions]
        .filter((s) => s.toLowerCase().includes(searchLower))
        .sort((a, b) => a.localeCompare(b, 'ko'))
    : []
  // 선택이 끝나면(입력값이 목록 중 하나와 정확히 일치) 목록 숨김
  const showSuggestions = matchedNames.length > 0 && !matchedNames.includes(name.trim())

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
          <h1 className={styles.title}>교사 시간표 검색</h1>
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
                autoComplete="off"
                disabled={batchLoading}
                aria-autocomplete="list"
                aria-expanded={showSuggestions}
                aria-controls="name-suggestions"
                id="teacher-name-input"
              />
              {showSuggestions && (
                <ul
                  id="name-suggestions"
                  className={styles.suggestionList}
                  role="listbox"
                  aria-label="일치하는 이름"
                >
                  {matchedNames.map((s) => (
                    <li
                      key={s}
                      role="option"
                      className={styles.suggestionItem}
                      onClick={() => setName(s)}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              )}
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
    </div>
  )
}
