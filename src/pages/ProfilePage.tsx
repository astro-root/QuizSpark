import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AppHeader from '../components/AppHeader'
import { Avatar, Chip, Icon, type IconName } from '../components/ui'
import { bandForRate } from '../lib/rank'
import ProfileTab from '../components/profile/ProfileTab'
import RecordsTab from '../components/profile/RecordsTab'
import QuestionHistoryTab from '../components/profile/QuestionHistoryTab'
import GenreRadarTab from '../components/profile/GenreRadarTab'
import TitleSelectTab from '../components/profile/TitleSelectTab'
import { apiFetch } from '../lib/api'
import { useState } from 'react'

type Tab = 'profile' | 'records' | 'history' | 'title' | 'genre'

export default function ProfilePage() {
  const [stats, setStats] = useState({ rate: 0, total: 0, wins: 0, correct: 0 })
  useEffect(() => {
    apiFetch('/api/records/me').then(r => r.ok ? r.json() : null).then(d => {
      if (d) setStats({ rate: d.rate ?? 0, total: d.stats.total, wins: d.stats.wins, correct: d.stats.totalCorrect })
    }).catch(() => {})
  }, [])
  // 注意: 公開されているのは `loading`。以前は存在しない `authLoading`(常に undefined)を読んでいたため、
  //       /profile を再読み込みすると、ユーザー取得前にホームへ戻されていた。
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('profile')

  useEffect(() => {
    if (authLoading) return
    if (!user) navigate('/')
  }, [authLoading, user, navigate])

  if (!user) return null

  const tabs: Array<{ key: Tab; icon: IconName; label: string }> = [
    { key: 'profile', icon: 'user',      label: 'プロフィール' },
    { key: 'records', icon: 'trophy',    label: '戦績' },
    { key: 'history', icon: 'clipboard', label: '問題履歴' },
    { key: 'title',   icon: 'crown',     label: '称号' },
    { key: 'genre',   icon: 'star',      label: 'ジャンル' },
  ]
  const rate = stats.rate || user.rate || 0
  const band = bandForRate(rate)

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column' }}>
      <AppHeader title="マイページ" />

      <div className="qp-head"><div className="qp-head__in">
        <Avatar name={user.name} src={user.avatarUrl} size={56} />
        <div style={{ minWidth: 0 }}>
          <p className="qp-head__name">{user.name}</p>
          <p className="qp-head__sub">{user.username ? `@${user.username}` : user.email}</p>
          <div style={{ marginTop: 6 }}><Chip tone="gold" icon={band.icon}>{band.label}</Chip></div>
        </div>
        <div className="qp-head__rate"><small>RATE</small><b>{rate}</b></div>
      </div></div>

      <div className="qp-tabs"><div className="qp-tabs__in" role="tablist" aria-label="マイページの項目">
        {tabs.map(t => (
          <button key={t.key} role="tab" id={`tab-${t.key}`} aria-selected={tab === t.key} aria-controls="profile-panel" className="qp-tab" onClick={() => setTab(t.key)}>
            <Icon name={t.icon} size={18} strokeWidth={tab === t.key ? 2.5 : 1.8} />
            <span>{t.label}</span>
          </button>
        ))}
      </div></div>

      <div className="inner profile-inner" role="tabpanel" id="profile-panel" aria-labelledby={`tab-${tab}`}>
        {tab === 'profile' && <ProfileTab />}
        {tab === 'records' && <RecordsTab />}
        {tab === 'history' && <QuestionHistoryTab />}
        {tab === 'title' && <TitleSelectTab stats={stats} />}
        {tab === 'genre' && <GenreRadarTab />}
      </div>
    </div>
  )
}
