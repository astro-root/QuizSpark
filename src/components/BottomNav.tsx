import { apiFetch } from '../lib/api'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect, useState } from 'react'
import { Home, Trophy, MessageCircle, User, PenLine } from 'lucide-react'

export default function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user } = useAuth()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!user) return
    const fetch_ = () => {
      apiFetch('/api/messages/unread', { credentials: 'include' })
        .then(r => r.json()).then(d => setUnread(d.count ?? 0)).catch(() => {})
    }
    fetch_()
    const t = setInterval(fetch_, 15000)
    return () => clearInterval(t)
  }, [user])

  if (!user) return null
  if (pathname.includes('/room/')) return null

  const tabs = [
    { path: '/',        Icon: Home,          label: 'ホーム' },
    { path: '/ranking', Icon: Trophy,        label: 'ランキング' },
    { path: null,       Icon: PenLine,       label: '作問',   fab: true },
    { path: '/chat',    Icon: MessageCircle, label: 'チャット', badge: unread },
    { path: '/profile', Icon: User,          label: 'マイページ' },
  ]

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
      background: 'var(--surface)',
      borderTop: '1px solid var(--border)',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      <div style={{
        display: 'flex',
        maxWidth: 'var(--w)',
        margin: '0 auto',
      }}>
        {tabs.map((t) => {
          if (t.fab) return (
            <div key="fab" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, padding: '10px 0 8px' }}>
              <button onClick={() => navigate('/create')}
                style={{
                  width: 46, height: 46, borderRadius: '50%',
                  background: 'linear-gradient(135deg,var(--accent),var(--accent2))',
                  color: '#fff', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(56,189,248,0.4)',
                  transform: 'translateY(-8px)',
                }}>
                <PenLine size={20} strokeWidth={2.5} />
              </button>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', marginTop: -4 }}>作問</span>
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
                {(t.badge ?? 0) > 0 && (
                  <span style={{
                    position: 'absolute', top: -5, right: -7,
                    background: '#e53e3e', color: '#fff',
                    borderRadius: 99, fontSize: 9, fontWeight: 800,
                    padding: '1px 4px', lineHeight: 1.4, minWidth: 14, textAlign: 'center'
                  }}>
                    {(t.badge ?? 0) > 99 ? '99+' : t.badge}
                  </span>
                )}
              </span>
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, color: active ? 'var(--accent)' : 'var(--muted)' }}>
                {t.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
