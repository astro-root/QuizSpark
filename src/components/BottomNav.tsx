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
  if (/^\/chat\/.+/.test(pathname)) return null

  const tabs = [
    { path: '/',        Icon: Home,          label: 'ホーム',    color: '#7c3aed' },
    { path: '/ranking', Icon: Trophy,        label: 'ランキング', color: '#f59e0b' },
    { path: null,       Icon: PenLine,       label: '作問',      color: '#fff', fab: true },
    { path: '/chat',    Icon: MessageCircle, label: 'チャット',   color: '#10b981', badge: unread },
    { path: '/profile', Icon: User,          label: 'マイページ', color: '#38bdf8' },
  ]

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
      background: 'var(--surface)',
      borderTop: '1px solid var(--border)',
      paddingBottom: 'env(safe-area-inset-bottom)',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
    }}>
      <div style={{ display: 'flex', maxWidth: 'var(--w)', margin: '0 auto' }}>
        {tabs.map((t) => {
          if (t.fab) return (
            <div key="fab" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, padding: '8px 0 10px' }}>
              <button onClick={() => navigate('/create')}
                style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: 'linear-gradient(135deg,#7c3aed,#6d28d9)',
                  color: '#fff', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(124,58,237,0.5)',
                  transform: 'translateY(-10px)',
                }}>
                <PenLine size={22} strokeWidth={2.5} />
              </button>
              <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', marginTop: -6 }}>作問</span>
            </div>
          )

          const active = t.path === '/' ? pathname === '/' : pathname.startsWith(t.path!)
          const { Icon } = t
          return (
            <button key={t.path} onClick={() => navigate(t.path!)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', padding: '10px 0 10px', gap: 4,
                background: 'none', border: 'none', cursor: 'pointer',
                position: 'relative',
              }}>
              {active && (
                <span style={{
                  position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                  width: 32, height: 3, borderRadius: '0 0 4px 4px',
                  background: t.color,
                }} />
              )}
              <span style={{
                position: 'relative',
                width: 36, height: 36, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: active ? `${t.color}22` : 'transparent',
                transition: 'all .2s',
              }}>
                <Icon size={22} strokeWidth={active ? 2.5 : 1.8}
                  color={active ? t.color : 'var(--muted)'} />
                {(t.badge ?? 0) > 0 && (
                  <span style={{
                    position: 'absolute', top: 2, right: 2,
                    background: '#e53e3e', color: '#fff',
                    borderRadius: 99, fontSize: 9, fontWeight: 800,
                    padding: '1px 4px', lineHeight: 1.4, minWidth: 14, textAlign: 'center'
                  }}>
                    {(t.badge ?? 0) > 99 ? '99+' : t.badge}
                  </span>
                )}
              </span>
              <span style={{
                fontSize: 10, fontWeight: active ? 800 : 500,
                color: active ? t.color : 'var(--muted)',
                transition: 'all .2s',
              }}>
                {t.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
