import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocketContext } from '../context/SocketContext'
import { useAuth } from '../context/AuthContext'

export default function HomePage() {
  const { createRoom, joinRoom, connected } = useSocketContext()
  const { user, loginWithGoogle, loginWithPassword, register, updateProfile, logout } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [roomId, setRoomId] = useState('')
  const [tab, setTab] = useState<'create'|'join'>('create')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // auth modal
  const [authTab, setAuthTab] = useState<'login'|'register'>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authName, setAuthName] = useState('')
  const [authError, setAuthError] = useState('')
  const [showAuth, setShowAuth] = useState(false)
  const [announcements, setAnnouncements] = useState<{id:number;title:string;body:string}[]>([])
  const [showProfile, setShowProfile] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [profileError, setProfileError] = useState('')

  useEffect(() => {
    fetch('/api/announcements').then(r => r.ok ? r.json() : []).then(setAnnouncements).catch(() => {})
  }, [])

  async function handleCreate() {
    if (!name.trim()) { setError('名前を入力してください'); return }
    setLoading(true); setError('')
    const id = await createRoom(name.trim())
    navigate('/room/' + id)
  }
  async function handleJoin() {
    if (!name.trim()) { setError('名前を入力してください'); return }
    if (!roomId.trim()) { setError('ルームIDを入力してください'); return }
    setLoading(true); setError('')
    const err = await joinRoom(roomId.trim().toUpperCase(), name.trim())
    if (err) { setError(err); setLoading(false); return }
    navigate('/room/' + roomId.trim().toUpperCase())
  }

  async function handleAuth() {
    setAuthError('')
    let err: string | null = null
    if (authTab === 'login') {
      err = await loginWithPassword(authEmail, authPassword)
    } else {
      if (!authName.trim()) { setAuthError('名前を入力してください'); return }
      err = await register(authName, authEmail, authPassword)
    }
    if (err) setAuthError(err)
    else setShowAuth(false)
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px 20px' }}>
      <div style={{ width:'100%', maxWidth:360 }}>

        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ fontFamily:'Orbitron,sans-serif', fontSize:36, fontWeight:900, letterSpacing:2, marginBottom:6 }}>
            <span style={{ color:'var(--accent)' }}>Quiz</span>
            <span style={{ color:'var(--gold)' }}>Spark</span>
            <span style={{ marginLeft:6 }}>⚡</span>
          </div>
          <p style={{ color:'var(--muted)', fontSize:13, letterSpacing:1 }}>リアルタイム早押しクイズ</p>
        </div>

        <div style={{ marginBottom:20 }}>
          <p style={lbl}>あなたの名前</p>
          <input value={name} onChange={e => setName(e.target.value)} maxLength={12} placeholder="ニックネーム" style={inp}
            onKeyDown={e => e.key==='Enter' && (tab==='create' ? handleCreate() : handleJoin())} />
        </div>

        <div style={{ display:'flex', background:'var(--surface)', borderRadius:12, padding:4, gap:4, marginBottom:20 }}>
          {(['create','join'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setError('') }}
              style={{ flex:1, padding:'10px', borderRadius:9, fontSize:14, fontWeight:700,
                background: tab===t ? 'var(--accent)' : 'transparent',
                color: tab===t ? '#fff' : 'var(--muted)', transition:'all .2s' }}>
              {t==='create' ? '+ 作成' : '→ 参加'}
            </button>
          ))}
        </div>

        {tab==='join' && (
          <div style={{ marginBottom:20 }}>
            <p style={lbl}>ルームID</p>
            <input value={roomId} onChange={e => setRoomId(e.target.value.toUpperCase())} maxLength={6}
              placeholder="XXXXXX" style={{ ...inp, fontFamily:'Orbitron,sans-serif', letterSpacing:6, textAlign:'center', fontSize:20 }}
              onKeyDown={e => e.key==='Enter' && handleJoin()} />
          </div>
        )}

        {error && <p style={{ color:'var(--wrong)', fontSize:13, marginBottom:12, padding:'8px 12px', background:'rgba(244,63,94,0.1)', borderRadius:8 }}>{error}</p>}

        <button disabled={loading || !connected} onClick={tab==='create' ? handleCreate : handleJoin}
          style={{ width:'100%', padding:'16px', borderRadius:12, fontSize:16, fontWeight:900,
            background: tab==='create' ? 'linear-gradient(135deg,var(--accent),var(--accent2))' : 'linear-gradient(135deg,var(--buzz),#f97316)',
            color:'#fff', opacity: loading||!connected ? 0.5 : 1,
            boxShadow: tab==='create' ? '0 4px 20px rgba(99,102,241,0.4)' : '0 4px 20px rgba(244,63,94,0.4)', marginBottom:12 }}>
          {tab==='create' ? '⚡ ルームを作成' : '→ ルームに参加'}
        </button>

        {/* Auth section */}
        {user ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:'var(--surface)', borderRadius:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              {user.avatarUrl && <img src={user.avatarUrl} style={{ width:28, height:28, borderRadius:'50%' }} alt="" />}
              <span style={{ fontSize:14, color:'var(--sub)' }}>{user.name}</span>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => { setProfileName(user.name); setShowProfile(true) }} style={{ fontSize:12, color:'var(--sub)', background:'none', padding:0 }}>編集</button>
              <button onClick={logout} style={{ fontSize:12, color:'var(--muted)', background:'none', padding:0 }}>ログアウト</button>
            </div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <button onClick={() => setShowAuth(true)}
              style={{ width:'100%', padding:'12px', borderRadius:10, fontSize:14, fontWeight:700, background:'var(--surface)', color:'var(--text)', border:'1px solid var(--border)' }}>
              📧 メールで登録 / ログイン
            </button>
            <button onClick={loginWithGoogle}
              style={{ width:'100%', padding:'12px', borderRadius:10, fontSize:14, fontWeight:700, background:'var(--surface)', color:'var(--text)', border:'1px solid var(--border)' }}>
              🔑 Googleでログイン
            </button>
          </div>
        )}

        {announcements.length > 0 && (
          <div style={{ marginTop:16, display:'flex', flexDirection:'column', gap:8 }}>
            {announcements.map(a => (
              <div key={a.id} style={{ padding:'12px 16px', background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:10 }}>
                <p style={{ fontSize:13, fontWeight:700, color:'var(--accent)', marginBottom:4 }}>📢 {a.title}</p>
                <p style={{ fontSize:13, color:'var(--sub)' }}>{a.body}</p>
              </div>
            ))}
          </div>
        )}

        <p style={{ textAlign:'center', marginTop:16 }}><a href='/submit' style={{ color:'var(--muted)', fontSize:13 }}>問題を投稿する →</a></p>
        {user?.isAdmin && <p style={{ textAlign:'center', marginTop:8 }}><a href='/admin' style={{ color:'var(--accent)', fontSize:13, fontWeight:700 }}>⚙️ 管理画面</a></p>}

        {!connected && <p style={{ textAlign:'center', color:'var(--muted)', fontSize:12, marginTop:12 }}>接続中...</p>}
      </div>


      {/* Profile Modal */}
      {showProfile && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, zIndex:1000 }}
          onClick={e => { if (e.target === e.currentTarget) setShowProfile(false) }}>
          <div style={{ width:'100%', maxWidth:320, background:'var(--surface)', borderRadius:16, padding:24 }}>
            <p style={{ fontWeight:800, fontSize:16, marginBottom:20 }}>プロフィール編集</p>
            <div style={{ marginBottom:16 }}>
              <p style={lbl}>名前</p>
              <input value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="ニックネーム" style={inp}
                onKeyDown={e => e.key==='Enter' && (async () => {
                  const err = await updateProfile(profileName)
                  if (err) setProfileError(err)
                  else setShowProfile(false)
                })()}/>
            </div>
            {profileError && <p style={{ color:'var(--wrong)', fontSize:13, marginBottom:12 }}>{profileError}</p>}
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setShowProfile(false)}
                style={{ flex:1, padding:'12px', borderRadius:10, fontSize:14, fontWeight:700, background:'var(--surface2)', color:'var(--muted)', border:'1px solid var(--border)' }}>
                キャンセル
              </button>
              <button onClick={async () => {
                  const err = await updateProfile(profileName)
                  if (err) setProfileError(err)
                  else setShowProfile(false)
                }}
                style={{ flex:1, padding:'12px', borderRadius:10, fontSize:14, fontWeight:900, background:'linear-gradient(135deg,var(--accent),var(--accent2))', color:'#fff' }}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuth && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, zIndex:1000 }}
          onClick={e => { if (e.target === e.currentTarget) setShowAuth(false) }}>
          <div style={{ width:'100%', maxWidth:360, background:'var(--surface)', borderRadius:16, padding:24 }}>
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
                <input value={authName} onChange={e => setAuthName(e.target.value)} placeholder="ニックネーム" style={inp} />
              </div>
            )}
            <div style={{ marginBottom:14 }}>
              <p style={lbl}>メールアドレス</p>
              <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="you@example.com" style={inp} />
            </div>
            <div style={{ marginBottom:16 }}>
              <p style={lbl}>パスワード{authTab==='register' ? '（8文字以上）' : ''}</p>
              <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="••••••••" style={inp}
                onKeyDown={e => e.key==='Enter' && handleAuth()} />
            </div>

            {authError && <p style={{ color:'var(--wrong)', fontSize:13, marginBottom:12, padding:'8px 12px', background:'rgba(244,63,94,0.1)', borderRadius:8 }}>{authError}</p>}

            <button onClick={handleAuth}
              style={{ width:'100%', padding:'14px', borderRadius:10, fontSize:15, fontWeight:900, background:'linear-gradient(135deg,var(--accent),var(--accent2))', color:'#fff', boxShadow:'0 4px 16px rgba(99,102,241,0.4)' }}>
              {authTab==='login' ? 'ログイン' : '登録する'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const lbl: React.CSSProperties = { fontSize:12, fontWeight:700, color:'var(--muted)', letterSpacing:1, textTransform:'uppercase', marginBottom:8 }
const inp: React.CSSProperties = { width:'100%', padding:'13px 16px', background:'var(--surface2)', border:'1.5px solid var(--border)', borderRadius:10, fontSize:16, color:'var(--text)' }
