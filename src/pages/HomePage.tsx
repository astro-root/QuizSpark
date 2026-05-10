import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSocketContext } from '../context/SocketContext'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

export default function HomePage() {
  const { createRoom, joinRoom, connected } = useSocketContext()
  const { user, loading: authLoading, loginWithGoogle, loginWithPassword, register, updateProfile, logout } = useAuth()
  const { theme, toggle: toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [name, setName] = useState('')
  const [roomId, setRoomId] = useState('')
  const [tab, setTab] = useState<'create'|'join'>('create')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [showAuth, setShowAuth] = useState(false)
  const [authTab, setAuthTab] = useState<'login'|'register'>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authName, setAuthName] = useState('')
  const [authError, setAuthError] = useState('')

  const [showProfile, setShowProfile] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [profileError, setProfileError] = useState('')

  const [announcements, setAnnouncements] = useState<{id:number;title:string;body:string}[]>([])

  // URLパラメータ ?join=XXXXXX で自動入力
  useEffect(() => {
    const joinId = searchParams.get('join')
    if (joinId) { setRoomId(joinId.toUpperCase()); setTab('join') }
  }, [])

  // アカウント名を自動セット
  useEffect(() => { if (user?.name) setName(user.name) }, [user?.name])

  useEffect(() => {
    fetch('/api/announcements').then(r => r.ok ? r.json() : []).then(setAnnouncements).catch(() => {})
  }, [])

  // アカウント未ログイン時はログイン画面を強制表示（ローディング完了後）
  useEffect(() => {
    if (!authLoading && !user) setShowAuth(true)
  }, [authLoading, user])

  async function handleCreate() {
    if (!user) { setShowAuth(true); return }
    const n = name.trim(); if (!n) { setError('名前を入力してください'); return }
    setLoading(true); setError('')
    const id = await createRoom(n); navigate('/room/' + id)
  }
  async function handleJoin() {
    if (!user) { setShowAuth(true); return }
    const n = name.trim(), rid = roomId.trim().toUpperCase()
    if (!n) { setError('名前を入力してください'); return }
    if (!rid) { setError('ルームIDを入力してください'); return }
    setLoading(true); setError('')
    const err = await joinRoom(rid, n)
    if (err) { setError(err); setLoading(false) } else navigate('/room/' + rid)
  }
  async function handleAuth() {
    setAuthError('')
    const err = authTab === 'login'
      ? await loginWithPassword(authEmail, authPassword)
      : await register(authName, authEmail, authPassword)
    if (err) setAuthError(err)
    else { setShowAuth(false) }
  }

  if (authLoading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', color:'var(--muted)' }}>
      読み込み中...
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column' }}>
      {/* ヘッダー */}
      <header style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 24px', borderBottom:'1px solid var(--border)', background:'var(--surface)' }}>
        <div style={{ fontFamily:'Orbitron,sans-serif', fontWeight:900, fontSize:18, letterSpacing:1 }}>
          <span style={{ color:'var(--accent)' }}>Quiz</span><span style={{ color:'var(--text)' }}>Spark</span><span style={{ marginLeft:4, fontSize:14 }}>⚡</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={toggleTheme} style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, padding:'6px 10px', fontSize:15, color:'var(--sub)' }}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          {user ? (
            <>
              <button onClick={() => { setProfileName(user.name); setShowProfile(true) }}
                style={{ display:'flex', alignItems:'center', gap:8, background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:10, padding:'6px 12px', color:'var(--text)' }}>
                {user.avatarUrl
                  ? <img src={user.avatarUrl} style={{ width:22, height:22, borderRadius:'50%' }} alt="" />
                  : <span style={{ width:22, height:22, borderRadius:'50%', background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#fff' }}>{user.name[0]}</span>
                }
                <span style={{ fontSize:13, fontWeight:600 }}>{user.name}</span>
              </button>
              <button onClick={logout} style={{ fontSize:12, color:'var(--muted)', background:'none', padding:'6px' }}>ログアウト</button>
            </>
          ) : (
            <button onClick={() => setShowAuth(true)} style={{ background:'var(--accent)', color:'#fff', borderRadius:8, padding:'7px 14px', fontSize:13, fontWeight:700 }}>
              ログイン
            </button>
          )}
        </div>
      </header>

      {/* メイン: PC2カラム */}
      <main style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'32px 20px 60px' }}>
        <div style={{ width:'100%', maxWidth:860, display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:32, alignItems:'start' }}>

          {/* 左: ロゴ・説明（PC時のみ存在感） */}
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            <div>
              <div style={{ fontFamily:'Orbitron,sans-serif', fontSize:44, fontWeight:900, lineHeight:1.1, marginBottom:12 }}>
                <div style={{ color:'var(--accent)' }}>Quiz</div>
                <div style={{ color:'var(--text)' }}>Spark⚡</div>
              </div>
              <p style={{ color:'var(--sub)', fontSize:15, lineHeight:1.8 }}>
                リアルタイム早押しクイズ対戦。<br/>
                友達とルームを作って、今すぐ対戦しよう。
              </p>
            </div>

            {announcements.length > 0 && (
              <div>
                {announcements.map(a => (
                  <div key={a.id} style={{ padding:'10px 14px', background:'rgba(56,189,248,0.08)', border:'1px solid rgba(56,189,248,0.2)', borderRadius:10, marginBottom:8 }}>
                    <p style={{ fontSize:12, fontWeight:700, color:'var(--accent)', marginBottom:2 }}>📢 {a.title}</p>
                    <p style={{ fontSize:12, color:'var(--sub)' }}>{a.body}</p>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display:'flex', gap:16 }}>
              <a href="/submit" style={{ color:'var(--muted)', fontSize:13 }}>問題を投稿</a>
              {(user as any)?.isAdmin && <a href="/admin" style={{ color:'var(--accent)', fontSize:13, fontWeight:700 }}>⚙ 管理画面</a>}
            </div>
          </div>

          {/* 右: アクション */}
          <div style={{ background:'var(--surface)', borderRadius:20, padding:'28px 24px', border:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:18 }}>

            {/* 名前 */}
            <div>
              <p style={lbl}>ニックネーム</p>
              <input value={name} onChange={e => setName(e.target.value)} maxLength={12} placeholder="名前を入力"
                style={{ ...inp, fontSize:18, fontWeight:600 }}
                onKeyDown={e => e.key==='Enter' && (tab==='create' ? handleCreate() : handleJoin())} />
              {user && name === user.name && (
                <p style={{ fontSize:11, color:'var(--muted)', marginTop:5 }}>アカウント名から自動入力</p>
              )}
            </div>

            {/* タブ */}
            <div style={{ display:'flex', background:'var(--surface2)', borderRadius:12, padding:4, gap:4 }}>
              {(['create','join'] as const).map(t => (
                <button key={t} onClick={() => { setTab(t); setError('') }}
                  style={{ flex:1, padding:'11px', borderRadius:9, fontSize:14, fontWeight:700,
                    background: tab===t ? (t==='create' ? 'var(--accent)' : 'var(--buzz)') : 'transparent',
                    color: tab===t ? '#fff' : 'var(--muted)', transition:'all .2s' }}>
                  {t==='create' ? '+ 作成' : '→ 参加'}
                </button>
              ))}
            </div>

            {/* ルームID */}
            {tab==='join' && (
              <div>
                <p style={lbl}>ルームID</p>
                <input value={roomId} onChange={e => setRoomId(e.target.value.toUpperCase())} maxLength={6}
                  placeholder="XXXXXX"
                  style={{ ...inp, fontFamily:'Orbitron,sans-serif', letterSpacing:10, textAlign:'center', fontSize:26, fontWeight:900 }}
                  onKeyDown={e => e.key==='Enter' && handleJoin()} />
                <p style={{ fontSize:11, color:'var(--muted)', marginTop:5 }}>※ 0・O・1・I・L は使用していません</p>
              </div>
            )}

            {error && (
              <div style={{ padding:'10px 14px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:8 }}>
                <p style={{ color:'var(--wrong)', fontSize:13 }}>{error}</p>
              </div>
            )}

            <button disabled={loading || !connected} onClick={tab==='create' ? handleCreate : handleJoin}
              style={{ padding:'18px', borderRadius:14, fontSize:17, fontWeight:900,
                background: tab==='create'
                  ? 'linear-gradient(135deg,var(--accent),var(--accent2))'
                  : 'linear-gradient(135deg,var(--buzz),var(--buzz2))',
                color:'#fff', opacity: loading||!connected ? 0.5 : 1,
                boxShadow: tab==='create'
                  ? '0 4px 20px rgba(56,189,248,0.35)'
                  : '0 4px 20px rgba(239,68,68,0.35)',
                letterSpacing:1 }}>
              {tab==='create' ? '⚡ ルームを作成' : '→ 入室する'}
            </button>

            {!connected && <p style={{ textAlign:'center', color:'var(--muted)', fontSize:12 }}>接続中...</p>}
            {!user && <p style={{ textAlign:'center', color:'var(--muted)', fontSize:12 }}>
              ゲームに参加するには<button onClick={() => setShowAuth(true)} style={{ background:'none', color:'var(--accent)', fontSize:12, fontWeight:700, padding:0 }}>ログイン</button>が必要です
            </p>}
          </div>
        </div>
      </main>

      {/* Auth Modal */}
      {showAuth && (
        <Modal onClose={user ? () => setShowAuth(false) : undefined}>
          <p style={{ fontWeight:900, fontSize:17, marginBottom:4 }}>QuizSparkへようこそ</p>
          <p style={{ fontSize:12, color:'var(--muted)', marginBottom:20 }}>ゲームに参加するにはアカウントが必要です</p>

          <div style={{ display:'flex', background:'var(--surface2)', borderRadius:10, padding:4, gap:4, marginBottom:20 }}>
            {(['login','register'] as const).map(t => (
              <button key={t} onClick={() => { setAuthTab(t); setAuthError('') }}
                style={{ flex:1, padding:'9px', borderRadius:8, fontSize:14, fontWeight:700,
                  background: authTab===t ? 'var(--accent)' : 'transparent',
                  color: authTab===t ? '#fff' : 'var(--muted)' }}>
                {t==='login' ? 'ログイン' : '新規登録'}
              </button>
            ))}
          </div>

          {authTab==='register' && (
            <div style={{ marginBottom:14 }}>
              <p style={lbl}>名前</p>
              <input value={authName} onChange={e => setAuthName(e.target.value)} placeholder="ニックネーム" style={inp}
                onKeyDown={e => e.key==='Enter' && handleAuth()} />
            </div>
          )}
          <div style={{ marginBottom:14 }}>
            <p style={lbl}>メールアドレス</p>
            <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="you@example.com" style={inp}
              onKeyDown={e => e.key==='Enter' && handleAuth()} />
          </div>
          <div style={{ marginBottom:16 }}>
            <p style={lbl}>パスワード{authTab==='register' ? '（8文字以上）' : ''}</p>
            <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="••••••••" style={inp}
              onKeyDown={e => e.key==='Enter' && handleAuth()} />
          </div>
          {authError && <p style={{ color:'var(--wrong)', fontSize:13, marginBottom:12, padding:'8px 12px', background:'rgba(239,68,68,0.1)', borderRadius:8 }}>{authError}</p>}
          <button onClick={handleAuth}
            style={{ width:'100%', padding:'14px', borderRadius:10, fontSize:15, fontWeight:900,
              background:'linear-gradient(135deg,var(--accent),var(--accent2))', color:'#fff',
              boxShadow:'0 4px 16px rgba(56,189,248,0.35)', marginBottom:10 }}>
            {authTab==='login' ? 'ログイン' : '登録する'}
          </button>
          <button onClick={loginWithGoogle}
            style={{ width:'100%', padding:'12px', borderRadius:10, fontSize:14, fontWeight:700,
              background:'var(--surface2)', color:'var(--text)', border:'1px solid var(--border)' }}>
            🔑 Googleでログイン
          </button>
        </Modal>
      )}

      {/* Profile Modal */}
      {showProfile && (
        <Modal onClose={() => setShowProfile(false)}>
          <p style={{ fontWeight:800, fontSize:16, marginBottom:20 }}>プロフィール編集</p>
          <div style={{ marginBottom:16 }}>
            <p style={lbl}>表示名</p>
            <input value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="ニックネーム" style={inp}
              onKeyDown={e => e.key==='Enter' && updateProfile(profileName).then(err => { if (err) setProfileError(err); else setShowProfile(false) })} />
          </div>
          {profileError && <p style={{ color:'var(--wrong)', fontSize:13, marginBottom:12 }}>{profileError}</p>}
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => setShowProfile(false)}
              style={{ flex:1, padding:'12px', borderRadius:10, fontSize:14, fontWeight:700, background:'var(--surface2)', color:'var(--muted)', border:'1px solid var(--border)' }}>
              キャンセル
            </button>
            <button onClick={() => updateProfile(profileName).then(err => { if (err) setProfileError(err); else setShowProfile(false) })}
              style={{ flex:1, padding:'12px', borderRadius:10, fontSize:14, fontWeight:900, background:'linear-gradient(135deg,var(--accent),var(--accent2))', color:'#fff' }}>
              保存
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, zIndex:1000 }}
      onClick={e => { if (e.target === e.currentTarget) onClose?.() }}>
      <div style={{ width:'100%', maxWidth:380, background:'var(--surface)', borderRadius:18, padding:'28px 24px' }}>
        {children}
      </div>
    </div>
  )
}

const lbl: React.CSSProperties = { fontSize:11, fontWeight:700, color:'var(--muted)', letterSpacing:1, textTransform:'uppercase', marginBottom:8 }
const inp: React.CSSProperties = { width:'100%', padding:'13px 16px', background:'var(--surface2)', border:'1.5px solid var(--border)', borderRadius:10, fontSize:16, color:'var(--text)' }
