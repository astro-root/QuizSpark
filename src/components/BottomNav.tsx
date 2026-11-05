import { apiFetch } from '../lib/api'
import { useNavigate, useLocation } from 'react-router-dom'
import { useIsPC } from '../hooks/useMediaQuery'
import { useAuth } from '../context/AuthContext'
import { useEffect, useState } from 'react'
import { Icon, type IconName } from './ui'

interface Tab { path: string | null; icon: IconName; label: string; fab?: boolean; badge?: number }

export default function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user } = useAuth()
  const [unread, setUnread] = useState(0)
  const isPC = useIsPC()

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
  if (pathname.startsWith('/chat/')) return null
  if (isPC) return null

  const tabs: Tab[] = [
    { path: '/',        icon: 'home',    label: 'ホーム' },
    { path: '/ranking', icon: 'trophy',  label: 'ランキング' },
    { path: null,       icon: 'pencil',  label: '作問', fab: true },
    { path: '/chat',    icon: 'message', label: 'チャット', badge: unread },
    { path: '/profile', icon: 'user',    label: 'マイページ' },
  ]

  return (
    <nav className="qs-bottomnav" aria-label="メインメニュー">
      <div className="qs-bottomnav__row">
        {tabs.map(t => {
          if (t.fab) return (
            <div key="fab" className="qs-bottomnav__item" style={{ justifyContent: 'flex-end' }}>
              <button className="qs-fab" aria-label="作問" onClick={() => navigate('/create')}>
                <Icon name="pencil" size={22} />
              </button>
              <span style={{ marginTop: -6 }} aria-hidden="true">{t.label}</span>
            </div>
          )
          const active = t.path === '/' ? pathname === '/' : pathname.startsWith(t.path!)
          return (
            <button key={t.path} className="qs-bottomnav__item" aria-current={active ? 'page' : undefined} onClick={() => navigate(t.path!)}>
              <span className="qs-bottomnav__icon">
                <Icon name={t.icon} size={22} strokeWidth={active ? 2.4 : 1.8} />
                {(t.badge ?? 0) > 0 && <span className="qs-badge" aria-label={`未読 ${t.badge}件`}>{(t.badge ?? 0) > 99 ? '99+' : t.badge}</span>}
              </span>
              {t.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
