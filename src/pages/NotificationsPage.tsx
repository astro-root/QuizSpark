import { apiFetch } from '../lib/api'
import AppHeader from '../components/AppHeader'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface Note { id: string; type: string; fromId: string | null; data: string | null; read: boolean; createdAt: string }
interface FromUser { id: string; name: string; avatarUrl: string | null }

function typeLabel(type: string, data: string | null) {
  if (type === 'dm') return `💬 メッセージ: ${data ?? ''}`
  if (type === 'follow') return '👤 フォローされました'
  return data ?? type
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [notes, setNotes] = useState<Note[]>([])
  const [users, setUsers] = useState<Record<string, FromUser>>({})

  useEffect(() => {
    if (!user) return
    apiFetch('/api/notifications')
      .then(r => r.json()).then(async (data: Note[]) => {
        setNotes(data)
        const ids = [...new Set(data.map(n => n.fromId).filter(Boolean))] as string[]
        const entries = await Promise.all(ids.map(id =>
          apiFetch(`/api/follow/user/${id}`).then(r => r.json()).then(u => [id, u])
        ))
        setUsers(Object.fromEntries(entries))
        apiFetch('/api/notifications/read-all', { method: 'POST', credentials: 'include' })
      })
  }, [user])

  return (
    <div className='page'>
      <AppHeader title="通知" back />
      <div className='inner-sm'>
        {notes.length === 0 && (
          <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 48, fontSize: 14 }}>通知はありません</p>
        )}
        {notes.map(n => {
          const from = n.fromId ? users[n.fromId] : null
          return (
            <div key={n.id}
              onClick={() => { if (n.type === 'dm' && n.fromId) navigate(`/chat/${n.fromId}`) }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid var(--border)', cursor: n.type === 'dm' ? 'pointer' : 'default', background: n.read ? 'transparent' : 'var(--surface)' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, overflow: 'hidden', flexShrink: 0 }}>
                {from?.avatarUrl ? <img src={from.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (from?.name[0] ?? '🔔')}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {from && <span style={{ fontWeight: 700, fontSize: 13 }}>{from.name}　</span>}
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>{typeLabel(n.type, n.data)}</span>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  {new Date(n.createdAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
