import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState, useEffect } from 'react'
import { useIsPC } from '../hooks/useMediaQuery'
import { useTheme } from '../context/ThemeContext'
import { apiFetch } from '../lib/api'
import { Icon, IconButton, type IconName } from './ui'

export default function PCNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user } = useAuth()
  const [unread, setUnread] = useState(0)
  const { theme, toggle } = useTheme()

  useEffect(() => {
    if (!user) return
    const f = () => apiFetch('/api/messages/unread').then(r => r.json()).then(d => setUnread(d.count ?? 0)).catch(() => {})
    f()
    const t = setInterval(f, 15000)
    return () => clearInterval(t)
  }, [user])

  const isPC = useIsPC()
  if (!isPC) return null
  if (!user) return null
  if (pathname.startsWith('/room/')) return null

  const tabs: Array<{ path: string; icon: IconName; label: string; badge?: number }> = [
    { path: '/',        icon: 'home',    label: 'ホーム' },
    { path: '/ranking', icon: 'trophy',  label: 'ランキング' },
    { path: '/create',  icon: 'pencil',  label: '作問' },
    { path: '/chat',    icon: 'message', label: 'チャット', badge: unread },
    { path: '/profile', icon: 'user',    label: 'マイページ' },
  ]

  return (
    <nav className="qs-topnav" aria-label="メインメニュー">
      <button className="qs-logo" onClick={() => navigate('/')} aria-label="QuizSpark ホーム">
        <span><b>Quiz</b>Spark</span>
        <Icon name="zap" size={16} />
      </button>
      <div style={{ display: 'flex', gap: 2, flex: 1, marginLeft: 12 }}>
        {tabs.map(t => {
          const active = t.path === '/' ? pathname === '/' : pathname.startsWith(t.path)
          return (
            <button key={t.path} className="qs-navtab" aria-current={active ? 'page' : undefined} onClick={() => navigate(t.path)}>
              <Icon name={t.icon} size={16} />
              {t.label}
              {(t.badge ?? 0) > 0 && <span className="qs-dot" role="img" aria-label="未読あり" />}
            </button>
          )
        })}
      </div>
      <IconButton icon="help" label="ヘルプ" onClick={() => navigate('/help')} />
      <IconButton icon={theme === 'dark' ? 'sun' : 'moon'} label={theme === 'dark' ? 'ライトテーマに切り替え' : 'ダークテーマに切り替え'} onClick={toggle} />
      <IconButton icon="bell" label="通知" onClick={() => navigate('/notifications')} />
    </nav>
  )
}
