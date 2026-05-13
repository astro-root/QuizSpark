import AppHeader from '../components/AppHeader'
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

interface UserResult { id: string; name: string; username: string | null; avatarUrl: string | null; rate: number }

function getRankEmoji(rate: number) {
  if (rate >= 2000) return '👑'
  if (rate >= 1500) return '💎'
  if (rate >= 1200) return '⚪'
  if (rate >= 900)  return '🥇'
  if (rate >= 600)  return '🥈'
  return '🥉'
}

export default function SearchPage() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [users, setUsers] = useState<UserResult[]>([])
  const [loading, setLoading] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    clearTimeout(timer.current)
    if (!q.trim()) { setUsers([]); return }
    setLoading(true)
    timer.current = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { credentials: 'include' })
        .then(r => r.json())
        .then(d => setUsers(d.users ?? []))
        .finally(() => setLoading(false))
    }, 300)
  }, [q])

  return (
    <div className='page'>
      <AppHeader back title="ユーザー検索" />
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <input autoFocus value={q} onChange={e => setQ(e.target.value)}
          placeholder="名前・ユーザーIDで検索…"
          style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 20, padding: '9px 16px', fontSize: 14, color: 'var(--text)', outline: 'none' }} />
      </div>
      <div className='inner' style={{ paddingTop: 8 }}>
        {loading && <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 32 }}>検索中…</p>}
        {!loading && q && users.length === 0 && <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 32 }}>ユーザーが見つかりません</p>}
        {users.map(u => (
          <div key={u.id} onClick={() => navigate(`/user/${u.id}`)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--surface2)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
              {u.avatarUrl ? <img src={u.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : u.name[0]}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: 14 }}>{u.name}</p>
              {u.username && <p style={{ fontSize: 12, color: 'var(--muted)' }}>@{u.username}</p>}
            </div>
            <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 700 }}>{getRankEmoji(u.rate)} {u.rate}pt</span>
          </div>
        ))}
      </div>
    </div>
  )
}
