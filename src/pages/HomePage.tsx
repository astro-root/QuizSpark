import { apiFetch } from '../lib/api'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocketContext } from '../context/SocketContext'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Shuffle, Users, Sun, Moon, Settings, Swords } from 'lucide-react'
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
    apiFetch('/api/announcements').then(r => r.ok ? r.json() : []).then(setAnnouncements).catch(() => {})
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

        {/* フリーマッチ */}
        <button onClick={() => navigate('/lobby')}
          style={{ width: '100%', padding: '20px 24px', borderRadius: 18, fontSize: 16, fontWeight: 900,
            background: 'linear-gradient(135deg,#0f766e,#14b8a6)', color: '#fff',
            boxShadow: '0 6px 24px rgba(20,184,166,0.3)',
            display: 'flex', alignItems: 'center', gap: 14, border: 'none', cursor: 'pointer' }}>
          <Swords size={28} strokeWidth={2.5} />
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontSize: 17, fontWeight: 900 }}>フリーマッチ</p>
            <p style={{ fontSize: 12, fontWeight: 400, opacity: 0.85, marginTop: 2 }}>ルーム作成・参加</p>
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

