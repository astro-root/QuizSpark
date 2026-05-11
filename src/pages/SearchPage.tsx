import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

interface UserResult { id: string; name: string; username: string | null; avatarUrl: string | null; rate: number }
interface SetResult { id: string; name: string; description: string | null; user: { id: string; name: string; avatarUrl: string | null }; _count: { items: number } }

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
  const [tab, setTab] = useState<'users' | 'sets'>('users')
  const [users, setUsers] = useState<UserResult[]>([])
  const [sets, setSets] = useState<SetResult[]>([])
  const [loading, setLoading] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    clearTimeout(timer.current)
    if (!q.trim()) { setUsers([]); setSets([]); return }
    setLoading(true)
    timer.current = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { credentials: 'include' })
        .then(r => r.json())
        .then(d => { setUsers(d.users ?? []); setSets(d.sets ?? []) })
        .finally(() => setLoading(false))
    }, 300)
  }, [q])

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', paddingBottom: 80 }}>
      {/* ヘッダー */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text)' }}>←</button>
        <input
          autoFocus
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="ユーザー・問題セットを検索…"
          style={{ flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 20, padding: '8px 16px', fontSize: 14, color: 'var(--text)', outline: 'none' }}
        />
      </div>

      {/* タブ */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
        {(['users', 'sets'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, padding: '12px', fontSize: 13, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer',
              color: tab === t ? 'var(--accent)' : 'var(--muted)',
              borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}` }}>
            {t === 'users' ? `👤 ユーザー${users.length > 0 ? ` (${users.length})` : ''}` : `📚 問題セット${sets.length > 0 ? ` (${sets.length})` : ''}`}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '8px 16px' }}>
        {loading && <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 32, fontSize: 14 }}>検索中…</p>}

        {!loading && q && tab === 'users' && users.length === 0 && (
          <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 32, fontSize: 14 }}>ユーザーが見つかりません</p>
        )}
        {!loading && q && tab === 'sets' && sets.length === 0 && (
          <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 32, fontSize: 14 }}>問題セットが見つかりません</p>
        )}

        {tab === 'users' && users.map(u => (
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

        {tab === 'sets' && sets.map(s => (
          <div key={s.id} onClick={() => navigate(`/sets/${s.id}`)}
            style={{ padding: '14px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
            <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{s.name}</p>
            {s.description && <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{s.description}</p>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--surface2)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>
                {s.user.avatarUrl ? <img src={s.user.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : s.user.name[0]}
              </div>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{s.user.name}</span>
              <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 'auto' }}>📝 {s._count.items}問</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
