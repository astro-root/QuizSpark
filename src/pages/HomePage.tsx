import { getTitleById } from '../lib/titles'
import { bandForRate } from '../lib/rank'
import { apiFetch } from '../lib/api'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import MatchmakingModal from '../components/MatchmakingModal'
import AppHeader from '../components/AppHeader'
import { Avatar, Button, Chip, Icon, IconButton } from '../components/ui'

export default function HomePage() {
  const [showAuth, setShowAuth] = useState(false)
  const [authTab, setAuthTab] = useState<'login'|'register'>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authName, setAuthName] = useState('')
  const [authUsername, setAuthUsername] = useState('')
  const [authError, setAuthError] = useState('')
  const [showMatchmaking, setShowMatchmaking] = useState(false)
  const [announcements, setAnnouncements] = useState<{id:number;title:string;body:string}[]>([])
  const [stats, setStats] = useState({ total: 0, wins: 0, correct: 0 })
  const [unread, setUnread] = useState(0)
  // 注意: AuthContext が公開しているのは `loading`。以前は存在しない `authLoading`(常に undefined)を読んでいたため、
  //       ログイン済みでも読み込み中にログイン画面が一瞬開いていた。
  const { user, loading: authLoading, loginWithPassword, loginWithGoogle, register } = useAuth()
  const { theme, toggle: toggleTheme } = useTheme()
  const navigate = useNavigate()

  useEffect(() => {
    apiFetch('/api/announcements').then(r => r.ok ? r.json() : []).then(setAnnouncements).catch(() => {})
  }, [])
  useEffect(() => {
    if (!user) return
    apiFetch('/api/notifications/unread').then(r => r.ok ? r.json() : {count:0}).then(d => setUnread(d.count ?? 0)).catch(() => {})
  }, [user])
  useEffect(() => {
    if (!user) return
    apiFetch('/api/records/me').then(r => r.ok ? r.json() : null).then(d => {
      if (d) setStats({ total: d.stats.total, wins: d.stats.wins, correct: d.stats.totalCorrect })
    }).catch(() => {})
  }, [user])

  useEffect(() => {
    if (!authLoading && !user) setShowAuth(true)
    if (!authLoading && user) setShowAuth(false)
  }, [authLoading, user])

  async function handleAuth() {
    if (!authEmail.trim()) { setAuthError('メールアドレスを入力してください'); return }
    if (!authPassword.trim()) { setAuthError('パスワードを入力してください'); return }
    if (authTab === 'register' && !authName.trim()) { setAuthError('名前を入力してください'); return }
    if (authTab === 'register' && !authUsername.trim()) { setAuthError('ユーザーIDを入力してください'); return }
    setAuthError('')
    const err = authTab === 'login'
      ? await loginWithPassword(authEmail, authPassword)
      : await register(authName, authEmail, authPassword, authUsername)
    if (err) setAuthError(err)
    else setShowAuth(false)
  }

  if (authLoading) return <div className="qg-center" role="status" style={{ color: 'var(--muted)' }}>読み込み中...</div>

  const headerRight = (
    <>
      {user && <IconButton icon="bell" label={unread > 0 ? `通知(未読${unread}件)` : '通知'} badge={unread} onClick={() => navigate('/notifications')} />}
      {user?.isAdmin && <IconButton icon="settings" label="管理画面" onClick={() => navigate('/admin')} />}
      <IconButton icon={theme === 'dark' ? 'sun' : 'moon'} label={theme === 'dark' ? 'ライトテーマに切り替え' : 'ダークテーマに切り替え'} onClick={toggleTheme} />
    </>
  )

  const onEnter = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleAuth() }
  const band = bandForRate(user?.rate ?? 0)

  return (
    <div className="page">
      <AppHeader right={headerRight} />

      <main className="qh">
        <div className="qh__main">
          {user && (
            <h1 className="qh__greet qs-hide-mobile">
              おかえりなさい、{user.name}
              <small>今日も一問、早押ししよう。</small>
            </h1>
          )}

          {/* 対戦の入口 */}
          <div className="qh__cards">
            <button className="qh-card qh-card--random" onClick={() => user ? setShowMatchmaking(true) : setShowAuth(true)}>
              <span className="qh-card__icon"><Icon name="zap" size={28} strokeWidth={2.4} /></span>
              <span className="qh-card__text"><b>ランダムマッチ</b><small>レーティング戦・今すぐ対戦</small></span>
              <Icon name="arrow-right" size={20} />
            </button>
            <button className="qh-card qh-card--free" onClick={() => navigate('/lobby')}>
              <span className="qh-card__icon"><Icon name="swords" size={28} strokeWidth={2.4} /></span>
              <span className="qh-card__text"><b>フリーマッチ</b><small>ルーム作成・フレンドと対戦</small></span>
              <Icon name="arrow-right" size={20} />
            </button>
          </div>

          {/* お知らせ */}
          {announcements.length > 0 && (
            <section className="qh-news" aria-label="お知らせ">
              <h2><Icon name="megaphone" size={14} />お知らせ</h2>
              {announcements.map(a => (
                <div key={a.id} className="qh-news__item">
                  <b>{a.title}</b>
                  <p>{a.body}</p>
                </div>
              ))}
            </section>
          )}
        </div>

        {/* 自分のカード */}
        {user && (
          <aside className="qh__hud" aria-label="あなたの成績">
            <div className="qh-me">
              <div className="qh-me__top">
                <Avatar name={user.name} src={user.avatarUrl} size={56} />
                <div style={{ minWidth: 0 }}>
                  <p className="qh-me__name">{user.name}</p>
                  <div className="qh-me__chips">
                    <Chip>{getTitleById(user.titleId).label}</Chip>
                    <Chip tone="gold" icon={band.icon}>{band.label}</Chip>
                  </div>
                </div>
                <div className="qh-me__rate"><small>RATE</small><b>{user.rate ?? 0}</b></div>
              </div>
              <div className="qh-stats">
                {[
                  { label: '対戦', value: stats.total },
                  { label: '勝利', value: stats.wins },
                  { label: '正解', value: stats.correct },
                ].map(s => (
                  <div key={s.label} className="qh-stat"><b>{s.value}</b><small>{s.label}</small></div>
                ))}
              </div>
              <Button block onClick={() => navigate('/profile')} icon="user">マイページを開く</Button>
            </div>
          </aside>
        )}
      </main>

      {/* ログイン / 新規登録 */}
      {showAuth && (
        <div className="qa" onClick={e => { if (e.target === e.currentTarget && user) setShowAuth(false) }}>
          <div className="qa__box" role="dialog" aria-modal="true" aria-labelledby="qa-title">
            <h2 id="qa-title">QuizSparkへようこそ</h2>
            <p className="qa__sub">ゲームに参加するにはアカウントが必要です</p>
            <div className="qa__tabs" role="tablist" aria-label="ログインと新規登録">
              {(['login','register'] as const).map(t => (
                <button key={t} role="tab" aria-selected={authTab === t} onClick={() => { setAuthTab(t); setAuthError('') }}>
                  {t === 'login' ? 'ログイン' : '新規登録'}
                </button>
              ))}
            </div>
            {authTab === 'register' && (
              <>
                <label className="qa__field">
                  <span>名前</span>
                  <input className="qa__input" value={authName} onChange={e => setAuthName(e.target.value)} placeholder="ニックネーム" autoComplete="nickname" onKeyDown={onEnter} />
                </label>
                <div className="qa__field">
                  <label htmlFor="qa-username"><span style={{ display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 700, color: 'var(--sub)' }}>ユーザーID(@ID)<em>必須</em></span></label>
                  <div className="qa__at">
                    <input id="qa-username" className="qa__input" value={authUsername} onChange={e => setAuthUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))} placeholder="your_id" autoComplete="username" onKeyDown={onEnter} maxLength={20} />
                  </div>
                  <p className="qa__hint">3〜20文字・英数字とアンダースコアのみ</p>
                </div>
              </>
            )}
            <label className="qa__field">
              <span>メールアドレス</span>
              <input className="qa__input" type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="メールアドレス または @ユーザーID" autoComplete="email" onKeyDown={onEnter} />
            </label>
            <label className="qa__field">
              <span>パスワード{authTab === 'register' ? '(8文字以上)' : ''}</span>
              <input className="qa__input" type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="••••••••" autoComplete={authTab === 'login' ? 'current-password' : 'new-password'} onKeyDown={onEnter} />
            </label>
            {authError && <p className="qa__error" role="alert">{authError}</p>}
            <div className="qa__actions">
              <Button variant="primary" size="lg" block onClick={handleAuth}>{authTab === 'login' ? 'ログイン' : '登録する'}</Button>
              <Button block icon="key" onClick={loginWithGoogle}>Googleでログイン</Button>
            </div>
          </div>
        </div>
      )}

      {showMatchmaking && <MatchmakingModal onClose={() => setShowMatchmaking(false)} />}
    </div>
  )
}
