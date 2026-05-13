import { apiFetch } from '../lib/api'
import AppHeader from '../components/AppHeader'
import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSocketContext } from '../context/SocketContext'
import { Swords, Search, X } from 'lucide-react'

interface Msg { id: string; fromId: string; body: string; createdAt: string }
interface Conv { user: { id: string; name: string; avatarUrl: string | null; username: string | null }; lastMessage: Msg | null; unread: number }
interface UserResult { id: string; name: string; username: string | null; avatarUrl: string | null }

function InviteCard({ roomId, onJoin }: { roomId: string; onJoin: (id: string) => void }) {
  return (
    <div style={{ background: 'linear-gradient(135deg,#0f766e,#14b8a6)', borderRadius: 14, padding: '14px 16px', maxWidth: 220 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Swords size={18} color="#fff" />
        <p style={{ fontWeight: 900, fontSize: 14, color: '#fff' }}>フリーマッチ招待</p>
      </div>
      <p style={{ fontFamily: 'Orbitron,sans-serif', fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: 6, marginBottom: 12 }}>
        {roomId.slice(0,3)} {roomId.slice(3)}
      </p>
      <button onClick={() => onJoin(roomId)}
        style={{ width: '100%', padding: '9px', borderRadius: 9, fontSize: 13, fontWeight: 700, background: '#fff', color: '#0f766e', border: 'none', cursor: 'pointer' }}>
        参加する →
      </button>
    </div>
  )
}

function parseInvite(body: string): string | null {
  const m = body.match(/^\[INVITE:([A-Z0-9]{6})\]$/)
  return m ? m[1] : null
}

export default function ChatPage() {
  const { userId } = useParams<{ userId?: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { createRoom, joinRoom } = useSocketContext()
  const [convs, setConvs] = useState<Conv[]>([])
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [searchUsers, setSearchUsers] = useState<UserResult[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    apiFetch('/api/messages/conversations', { credentials: 'include' })
      .then(r => r.json()).then(setConvs).catch(() => {})
  }, [userId])

  useEffect(() => {
    if (!userId) return
    const load = () =>
      fetch(`/api/messages/messages/${userId}`, { credentials: 'include' })
        .then(r => r.json()).then(data => { setMsgs(Array.isArray(data) ? data : []) }).catch(() => {})
    load()
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [userId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  useEffect(() => {
    clearTimeout(searchTimer.current)
    if (!searchQ.trim()) { setSearchUsers([]); return }
    searchTimer.current = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(searchQ)}`, { credentials: 'include' })
        .then(r => r.json()).then(d => setSearchUsers(d.users ?? [])).catch(() => {})
    }, 300)
  }, [searchQ])

  async function send(overrideBody?: string) {
    const text = overrideBody ?? body
    if (!text.trim() || !userId || sending) return
    setSending(true)
    const r = await fetch(`/api/messages/messages/${userId}`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: text })
    })
    if (r.ok) {
      const msg = await r.json()
      setMsgs(prev => [...prev, msg])
      if (!overrideBody) setBody('')
    }
    setSending(false)
  }

  async function sendInvite() {
    if (!user || inviting) return
    setInviting(true)
    const roomId = await createRoom(user.name)
    await send(`[INVITE:${roomId}]`)
    navigate('/room/' + roomId)
    setInviting(false)
  }

  async function joinInvite(roomId: string) {
    if (!user) return
    const err = await joinRoom(roomId, user.name)
    if (!err) navigate('/room/' + roomId)
    else alert('ルームに参加できませんでした: ' + err)
  }

  const selectedUser = convs.find(c => c.user.id === userId)?.user

  return (
    <div style={{ display: 'flex', height: '100dvh', background: 'var(--bg)', maxWidth: 700, margin: '0 auto' }}>

      {/* 会話リスト */}
      {(!userId || window.innerWidth > 600) && (
        <div style={{ width: userId ? 220 : '100%', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
          <AppHeader title="チャット" back right={
            <button onClick={() => setShowSearch(true)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 4 }}>
              <Search size={20} />
            </button>
          } />
          {convs.length === 0 && (
            <p style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: 32 }}>
              フォロー中のユーザーが<br />いません
            </p>
          )}
          {convs.map(c => (
            <button key={c.user.id} onClick={() => navigate(`/chat/${c.user.id}`)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: c.user.id === userId ? 'var(--surface2)' : 'none', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--surface2)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                {c.user.avatarUrl ? <img src={c.user.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{c.user.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.lastMessage?.body.startsWith('[INVITE:') ? '⚔️ フリーマッチ招待' : (c.lastMessage?.body ?? 'メッセージなし')}
                </div>
              </div>
              {c.unread > 0 && (
                <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 99, fontSize: 11, fontWeight: 800, padding: '1px 6px', flexShrink: 0 }}>{c.unread}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* メッセージペイン */}
      {userId ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <AppHeader title={selectedUser?.name ?? '...'} back="/chat" />
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {msgs.map(m => {
              const mine = m.fromId === user?.id
              const inviteId = parseInvite(m.body)
              return (
                <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                  {inviteId ? (
                    <InviteCard roomId={inviteId} onJoin={joinInvite} />
                  ) : (
                    <div style={{ maxWidth: '75%', background: mine ? 'var(--accent)' : 'var(--surface2)', color: mine ? '#fff' : 'var(--text)', borderRadius: mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px', padding: '8px 12px', fontSize: 14, lineHeight: 1.5, wordBreak: 'break-word' }}>
                      {m.body}
                    </div>
                  )}
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
          <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, paddingBottom: 'calc(10px + env(safe-area-inset-bottom))' }}>
            <button onClick={sendInvite} disabled={inviting}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', borderRadius: 20, fontSize: 13, fontWeight: 700,
                background: 'rgba(20,184,166,0.15)', color: '#14b8a6', border: '1px solid rgba(20,184,166,0.3)', cursor: 'pointer', flexShrink: 0, opacity: inviting ? 0.5 : 1 }}>
              <Swords size={14} /> 招待
            </button>
            <input value={body} onChange={e => setBody(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder="メッセージを入力…"
              style={{ flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 20, padding: '8px 14px', fontSize: 14, color: 'var(--text)', outline: 'none' }} />
            <button onClick={() => send()} disabled={sending || !body.trim()}
              style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 20, padding: '8px 16px', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: sending || !body.trim() ? 0.5 : 1 }}>
              送信
            </button>
          </div>
        </div>
      ) : null}

      {/* 検索ポップアップ */}
      {showSearch && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', flexDirection: 'column', padding: '60px 0 0' }}
          onClick={e => { if (e.target === e.currentTarget) setShowSearch(false) }}>
          <div style={{ background: 'var(--bg)', flex: 1, borderRadius: '20px 20px 0 0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Search size={16} color="var(--muted)" />
              <input autoFocus value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder="ユーザーを検索…"
                style={{ flex: 1, background: 'none', border: 'none', fontSize: 15, color: 'var(--text)', outline: 'none' }} />
              <button onClick={() => { setShowSearch(false); setSearchQ(''); setSearchUsers([]) }}
                style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4 }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {searchUsers.map(u => (
                <button key={u.id} onClick={() => { navigate(`/chat/${u.id}`); setShowSearch(false); setSearchQ(''); setSearchUsers([]) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', width: '100%', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface2)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                    {u.avatarUrl ? <img src={u.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : u.name[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{u.name}</p>
                    {u.username && <p style={{ fontSize: 12, color: 'var(--muted)' }}>@{u.username}</p>}
                  </div>
                </button>
              ))}
              {searchQ && searchUsers.length === 0 && (
                <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 32, fontSize: 14 }}>見つかりません</p>
              )}
              {!searchQ && (
                <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 32, fontSize: 14 }}>名前・ユーザーIDで検索</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
