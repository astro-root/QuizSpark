import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api'
import { useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useIsPC } from '../hooks/useMediaQuery'
import { Icon, IconButton } from './ui'

interface Props {
  title?: string
  back?: boolean | string
  right?: React.ReactNode
  left?: React.ReactNode
}

export default function AppHeader({ title, back, right, left }: Props) {
  const isPC = useIsPC()
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const { user } = useAuth()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!user) return
    const load = () => apiFetch('/api/notifications/unread').then(r => r.ok ? r.json() : { count: 0 }).then(d => setUnread(d.count ?? 0)).catch(() => {})
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [user])

  if (isPC) return null

  function handleBack() {
    if (typeof back === 'string') navigate(back)
    else navigate(-1)
  }

  return (
    <header className="qs-appheader">
      <div className="qs-appheader__side">
        {left ?? (back !== undefined ? (
          <IconButton icon="chevron-left" label="戻る" onClick={handleBack} />
        ) : (
          <button className="qs-logo" onClick={() => navigate('/')} aria-label="QuizSpark ホーム">
            <span><b>Quiz</b>Spark</span>
            <Icon name="zap" size={16} />
          </button>
        ))}
      </div>
      {title ? <h1 className="qs-appheader__title">{title}</h1> : <div className="qs-appheader__title" />}
      <div className="qs-appheader__side qs-appheader__side--right">
        {right ?? (
          <>
            {user && <IconButton icon="bell" label={unread > 0 ? `通知(未読${unread}件)` : '通知'} badge={unread} onClick={() => navigate('/notifications')} />}
            <IconButton icon={theme === 'dark' ? 'sun' : 'moon'} label={theme === 'dark' ? 'ライトテーマに切り替え' : 'ダークテーマに切り替え'} onClick={toggle} />
          </>
        )}
      </div>
    </header>
  )
}
