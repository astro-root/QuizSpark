import { getTitleById } from '../lib/titles'
import { apiFetch } from '../lib/api'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocketContext } from '../context/SocketContext'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Shuffle, Users, Sun, Moon, Settings, Swords, Zap, Star } from 'lucide-react'
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
  const [authUsername, setAuthUsername] = useState('')
  const [authError, setAuthError] = useState('')
  const [showMatchmaking, setShowMatchmaking] = useState(false)
  const [announcements, setAnnouncements] = useState<{id:number;title:string;body:string}[]>([])
  const [stats, setStats] = useState({ total: 0, wins: 0, correct: 0 })

  useEffect(() => {
    apiFetch('/api/announcements').then(r => r.ok ? r.json() : []).then(setAnnouncements).catch(() => {})
  }, [])
  useEffect(() => {
    if (!user) return
    apiFetch('/api/records/me').then(r => r.ok ? r.json() : null).then(d => {
      if (d) setStats({ total: d.stats.total, wins: d.stats.wins, correct: d.stats.totalCorrect })
    }).catch(() => {})
  }, [user])

  useEffect(() => {
    if (!authLoading && !user) setShowAuth(true)
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

  async function quickJoin(roomId: string) {
    if (!user) { setShowAuth(true); return }
    const err = await joinRoom(roomId, user.name)
    if (!err) navigate('/room/' + roomId)
  }

  if (authLoading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--muted)', maxWidth: 'var(--w)', margin: '0 auto' }}>読み込み中...</div>
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
    <div className='page'>
      <AppHeader right={headerRight} />

      <div className='inner' style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* プレイヤーHUD */}
        {user && (
          <div style={{ position: 'relative', padding: '16px', background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle,rgba(124,58,237,0.18) 0%,transparent 70%)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,var(--accent),var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: '#fff', overflow: 'hidden', boxShadow: '0 0 0 3px rgba(124,58,237,0.35)' }}>
                  {user.avatarUrl ? <img src={user.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : user.name[0]}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 900, fontSize: 16, marginBottom: 2 }}>{user.name}</p>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)', background: 'rgba(124,58,237,0.15)', padding: '2px 8px', borderRadius: 20 }}>{getTitleById((user as any)?.titleId).label}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, letterSpacing: 1 }}>RATE</p>
                <p style={{ fontSize: 26, fontWeight: 900, color: 'var(--accent)', lineHeight: 1 }}>{(user as any)?.rate ?? 0}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {[
                { label: '対戦', value: stats.total },
                { label: '勝利', value: stats.wins },
                { label: '正解', value: stats.correct },
              ].map(s => (
                <div key={s.label} style={{ flex: 1, textAlign: 'center', padding: '8px 4px', background: 'var(--surface2)', borderRadius: 10 }}>
                  <p style={{ fontSize: 16, fontWeight: 900 }}>{s.value}</p>
                  <p style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700 }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* バトルボタン */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => user ? setShowMatchmaking(true) : setShowAuth(true)}
            style={{ width: '100%', padding: '0', borderRadius: 20, border: 'none', cursor: 'pointer', overflow: 'hidden', position: 'relative',
              background: 'linear-gradient(135deg,#4c1d95,#7c3aed,#a855f7)',
              boxShadow: '0 8px 32px rgba(124,58,237,0.45)' }}>
            <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
            <div style={{ position: 'absolute', bottom: -20, left: 20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '22px 24px', position: 'relative' }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Shuffle size={26} color="#fff" strokeWidth={2.5} />
              </div>
              <div style={{ textAlign: 'left', flex: 1 }}>
                <p style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: 0.5 }}>ランダムマッチ</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 3 }}>レーティング戦・今すぐ対戦</p>
              </div>
              <Zap size={20} color="rgba(255,255,255,0.5)" />
            </div>
          </button>

          <button onClick={() => navigate('/lobby')}
            style={{ width: '100%', padding: '0', borderRadius: 20, border: 'none', cursor: 'pointer', overflow: 'hidden', position: 'relative',
              background: 'linear-gradient(135deg,#064e3b,#0f766e,#14b8a6)',
              boxShadow: '0 8px 32px rgba(20,184,166,0.3)' }}>
            <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '22px 24px', position: 'relative' }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Swords size={26} color="#fff" strokeWidth={2.5} />
              </div>
              <div style={{ textAlign: 'left', flex: 1 }}>
                <p style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: 0.5 }}>フリーマッチ</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 3 }}>ルーム作成・フレンドと対戦</p>
              </div>
              <Star size={20} color="rgba(255,255,255,0.5)" />
            </div>
          </button>
        </div>

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
              <>
              <div style={{ marginBottom: 14 }}>
                <p style={lbl}>名前</p>
                <input value={authName} onChange={e => setAuthName(e.target.value)} placeholder="ニックネーム" style={inp} onKeyDown={e => e.key === 'Enter' && handleAuth()} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <p style={lbl}>ユーザーID（@ID）<span style={{ color: 'var(--wrong)', marginLeft: 4 }}>必須</span></p>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: 15 }}>@</span>
                  <input value={authUsername} onChange={e => setAuthUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))} placeholder="your_id" style={{ ...inp, paddingLeft: 28 }} onKeyDown={e => e.key === 'Enter' && handleAuth()} maxLength={20} />
                </div>
                <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>3〜20文字・英数字とアンダースコアのみ</p>
              </div>
              </>
            )}
            <div style={{ marginBottom: 14 }}>
              <p style={lbl}>メールアドレス</p>
              <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="メールアドレス または @ユーザーID" style={inp} onKeyDown={e => e.key === 'Enter' && handleAuth()} />
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
