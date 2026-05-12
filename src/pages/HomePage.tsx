import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocketContext } from '../context/SocketContext'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Shuffle, Users, Sun, Moon, Settings } from 'lucide-react'
import MatchmakingModal from '../components/MatchmakingModal'
import AppHeader from '../components/AppHeader'

export default function HomePage() {
  const { joinRoom, publicRooms } = useSocketContext()
  const { user, loading: authLoading, loginWithGoogle, loginWithPassword, register } = useAuth()
  const { theme, toggle: toggleTheme } = useTheme()
  const navigate = useNavigate()

  const [showAuth, setShowAuth] = useState(false)
  const [authTab, setAuthTab] = useState<'login'|'register'>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authName, setAuthName] = useState('')
  const [authError, setAuthError] = useState('')
  const [showMatchmaking, setShowMatchmaking] = useState(false)
  const [announcements, setAnnouncements] = useState<{id:number;title:string;body:string}[]>([])

  useEffect(() => {
    fetch('/api/announcements').then(r => r.ok ? r.json() : []).then(setAnnouncements).catch(() => {})
  }, [])

  useEffect(() => {
    if (!authLoading && !user) setShowAuth(true)
  }, [authLoading, user])

  async function handleAuth() {
    setAuthError('')
    const err = authTab === 'login'
      ? await loginWithPassword(authEmail, authPassword)
      : await register(authName, authEmail, authPassword)
    if (err) setAuthError(err)
    else setShowAuth(false)
  }

  async function quickJoin(roomId: string) {
    if (!user) { setShowAuth(true); return }
    const err = await joinRoom(roomId, user.name)
    if (!err) navigate('/room/' + roomId)
  }

  if (authLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--muted)' }}>読み込み中...</div>
  )

  const headerRight = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {(user as any)?.isAdmin && (
        <button onClick={() => navigate('/admin')}
          style={{ background: 'none', border: 'none', padding: 8, color: 'var(--accent)', display: 'flex' }}>
          <Settings size={18} />
        </button>
      )}
      <button onClick={toggleTheme}
        style={{ background: 'none', border: 'none', padding: 8, color: 'var(--muted)', display: 'flex' }}>
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', paddingBottom: 80 }}>
      <AppHeader right={headerRight} />

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ユーザーカード */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,var(--accent),var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
              {user.avatarUrl ? <img src={user.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : user.name[0]}
            </div>
            <div>
              <p style={{ fontWeight: 800, fontSize: 15 }}>{user.name}</p>
              <p style={{ fontSize: 12, color: 'var(--muted)' }}>QuizSpark プレイヤー</p>
            </div>
          </div>
        )}

        {/* ランダムマッチ */}
        <button onClick={() => user ? setShowMatchmaking(true) : setShowAuth(true)}
          style={{ width: '100%', padding: '20px 24px', borderRadius: 18, fontSize: 16, fontWeight: 900,
            background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff',
            boxShadow: '0 6px 24px rgba(124,58,237,0.35)',
            display: 'flex', alignItems: 'center', gap: 14, border: 'none', cursor: 'pointer' }}>
          <Shuffle size={28} strokeWidth={2.5} />
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontSize: 17, fontWeight: 900 }}>ランダムマッチ</p>
            <p style={{ fontSize: 12, fontWeight: 400, opacity: 0.85, marginTop: 2 }}>今すぐ対戦開始</p>
          </div>
        </button>

        {/* お知らせ */}
        {announcements.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase' }}>📢 お知らせ</p>
            {announcements.map(a => (
              <div key={a.id} style={{ padding: '12px 14px', background: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.18)', borderRadius: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', marginBottom: 2 }}>{a.title}</p>
                <p style={{ fontSize: 12, color: 'var(--sub)' }}>{a.body}</p>
              </div>
            ))}
          </div>
        )}

        {/* 公開ルーム */}
        {publicRooms.length > 0 && (
          <div style={{ background: 'var(--surface)', borderRadius: 16, padding: '16px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Users size={15} color="var(--muted)" />
              <p style={{ fontWeight: 800, fontSize: 14 }}>参加できるルーム</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {publicRooms.map(room => (
                <div key={room.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--surface2)', borderRadius: 10 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 700 }}>{room.hostName} のルーム</p>
                    <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{room.ruleId.toUpperCase()} · {room.questionCount}問 · {room.playerCount}人</p>
                  </div>
                  <button onClick={() => quickJoin(room.id)}
                    style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: 'var(--buzz)', color: '#fff', flexShrink: 0, border: 'none', cursor: 'pointer' }}>
                    参加
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <a href="/contact" style={{ textAlign: 'center', padding: '12px', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', fontSize: 13, color: 'var(--muted)', fontWeight: 600, textDecoration: 'none' }}>
          📬 お問い合わせ
        </a>
      </div>

      {/* Auth Modal */}
      {showAuth && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget && user) setShowAuth(false) }}>
          <div style={{ width: '100%', maxWidth: 380, background: 'var(--surface)', borderRadius: 20, padding: '28px 24px' }}>
            <p style={{ fontWeight: 900, fontSize: 17, marginBottom: 4 }}>QuizSparkへようこそ</p>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20 }}>ゲームに参加するにはアカウントが必要です</p>
            <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: 10, padding: 4, gap: 4, marginBottom: 20 }}>
              {(['login','register'] as const).map(t => (
                <button key={t} onClick={() => { setAuthTab(t); setAuthError('') }}
                  style={{ flex: 1, padding: '9px', borderRadius: 8, fontSize: 14, fontWeight: 700,
                    background: authTab === t ? 'var(--accent)' : 'transparent',
                    color: authTab === t ? '#fff' : 'var(--muted)', border: 'none', cursor: 'pointer' }}>
                  {t === 'login' ? 'ログイン' : '新規登録'}
                </button>
              ))}
            </div>
            {authTab === 'register' && (
              <div style={{ marginBottom: 14 }}>
                <p style={lbl}>名前</p>
                <input value={authName} onChange={e => setAuthName(e.target.value)} placeholder="ニックネーム" style={inp} onKeyDown={e => e.key === 'Enter' && handleAuth()} />
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <p style={lbl}>メールアドレス</p>
              <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="you@example.com" style={inp} onKeyDown={e => e.key === 'Enter' && handleAuth()} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <p style={lbl}>パスワード{authTab === 'register' ? '（8文字以上）' : ''}</p>
              <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="••••••••" style={inp} onKeyDown={e => e.key === 'Enter' && handleAuth()} />
            </div>
            {authError && <p style={{ color: 'var(--wrong)', fontSize: 13, marginBottom: 12, padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 8 }}>{authError}</p>}
            <button onClick={handleAuth}
              style={{ width: '100%', padding: '14px', borderRadius: 10, fontSize: 15, fontWeight: 900,
                background: 'linear-gradient(135deg,var(--accent),var(--accent2))', color: '#fff', marginBottom: 10, border: 'none', cursor: 'pointer' }}>
              {authTab === 'login' ? 'ログイン' : '登録する'}
            </button>
            <button onClick={loginWithGoogle}
              style={{ width: '100%', padding: '12px', borderRadius: 10, fontSize: 14, fontWeight: 700,
                background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', cursor: 'pointer' }}>
              🔑 Googleでログイン
            </button>
          </div>
        </div>
      )}

      {showMatchmaking && <MatchmakingModal onClose={() => setShowMatchmaking(false)} />}
    </div>
  )
}

const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }
const inp: React.CSSProperties = { width: '100%', padding: '13px 16px', background: 'var(--surface2)', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 16, color: 'var(--text)' }
