import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect, useState } from 'react'

const TABS: { path: string; icon: string; label: string; badge?: string }[] = [
  { path: '/',        icon: '🏠', label: 'ホーム' },
  { path: '/match',   icon: '⚔️', label: '対戦' },
  { path: '/search',  icon: '🔍', label: '検索' },
  { path: '/chat',    icon: '💬', label: 'チャット', badge: 'msg' },
  { path: '/notifications', icon: '🔔', label: '通知', badge: 'note' },
  { path: '/profile', icon: '👤', label: 'マイページ' },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user } = useAuth()
  const [unread, setUnread] = useState(0)
  const [unreadNote, setUnreadNote] = useState(0)

  useEffect(() => {
    if (!user) return
    const fetch_ = () => {
      fetch('/api/messages/unread', { credentials: 'include' })
        .then(r => r.json()).then(d => setUnread(d.count ?? 0)).catch(() => {})
      fetch('/api/notifications/unread', { credentials: 'include' })
        .then(r => r.json()).then(d => setUnreadNote(d.count ?? 0)).catch(() => {})
    }
    fetch_()
    const t = setInterval(fetch_, 15000)
    return () => clearInterval(t)
  }, [user])

  if (!user) return null
  if (pathname.includes('/room/')) return null

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
      background: 'var(--surface)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {TABS.map(t => {
        const active = t.path === '/' ? pathname === '/' : pathname.startsWith(t.path)
        return (
          <button key={t.path} onClick={() => navigate(t.path)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '10px 0 6px', gap: 3,
              background: 'none', border: 'none', cursor: 'pointer',
              borderTop: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
            }}>
            <span style={{ fontSize: 22, position: 'relative' }}>
              {t.icon}
              {((t.badge === 'msg' && unread > 0) || (t.badge === 'note' && unreadNote > 0)) && (
                <span style={{ position: 'absolute', top: -4, right: -6, background: '#e53e3e', color: '#fff', borderRadius: 99, fontSize: 9, fontWeight: 800, padding: '1px 4px', lineHeight: 1.4 }}>
                  {t.badge === 'msg' ? (unread > 99 ? '99+' : unread) : (unreadNote > 99 ? '99+' : unreadNote)}
                </span>
              )}
            </span>
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, color: active ? 'var(--accent)' : 'var(--muted)' }}>
              {t.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
