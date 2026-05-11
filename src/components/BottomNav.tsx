import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect, useState } from 'react'
import { Home, Swords, Search, MessageCircle, Bell, User, Plus } from 'lucide-react'

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

  const tabs = [
    { path: '/',       Icon: Home,          label: 'ホーム' },
    { path: '/search', Icon: Search,        label: '検索' },
    { path: null,      Icon: Plus,          label: '作問', fab: true },
    { path: '/chat',   Icon: MessageCircle, label: 'チャット', badge: unread },
    { path: '/profile',Icon: User,          label: 'マイページ' },
  ]

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
      background: 'var(--surface)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {tabs.map((t, i) => {
        if (t.fab) return (
          <div key="fab" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button onClick={() => navigate('/submit')}
              style={{
                width: 50, height: 50, borderRadius: '50%',
                background: 'linear-gradient(135deg,var(--accent),var(--accent2))',
                color: '#fff', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(56,189,248,0.45)',
                transform: 'translateY(-10px)',
              }}>
              <Plus size={24} strokeWidth={2.5} />
            </button>
          </div>
        )

        const active = t.path === '/' ? pathname === '/' : pathname.startsWith(t.path!)
        const { Icon } = t

        return (
          <button key={t.path} onClick={() => navigate(t.path!)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: '10px 0 8px', gap: 4,
              background: 'none', border: 'none', cursor: 'pointer',
            }}>
            <span style={{ position: 'relative' }}>
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8}
                color={active ? 'var(--accent)' : 'var(--muted)'} />
              {t.badge! > 0 && (
                <span style={{
                  position: 'absolute', top: -5, right: -7,
                  background: '#e53e3e', color: '#fff',
                  borderRadius: 99, fontSize: 9, fontWeight: 800,
                  padding: '1px 4px', lineHeight: 1.4, minWidth: 14, textAlign: 'center'
                }}>
                  {t.badge! > 99 ? '99+' : t.badge}
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
