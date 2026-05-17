import React from 'react'
import { apiFetch } from '../lib/api'
import AppHeader from '../components/AppHeader'
import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSocketContext } from '../context/SocketContext'
import { Swords, Search, X, ChevronLeft, MessageSquare, Send as SendIcon } from 'lucide-react'

interface Msg { id: string; fromId: string; body: string; createdAt: string }
interface Conv { user: { id: string; name: string; avatarUrl: string | null; username: string | null }; lastMessage: Msg | null; unread: number }
interface UserResult { id: string; name: string; username: string | null; avatarUrl: string | null }

function Avatar({ url, name, size = 40 }: { url?: string | null; name: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg,var(--accent),var(--accent2))', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 900, color: '#fff' }}>
      {url ? <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : name[0]}
    </div>
  )
}

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
  const inputRef = useRef<HTMLInputElement>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout>>()
  const [winW, setWinW] = useState(window.innerWidth)

  useEffect(() => {
    const h = () => setWinW(window.innerWidth)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  const isPC = winW >= 768
  const selectedUser = convs.find(c => c.user.id === userId)?.user

  useEffect(() => {
    apiFetch('/api/messages/conversations')
      .then(r => r.json()).then(d => setConvs(Array.isArray(d) ? d : [])).catch(() => {})
  }, [userId])

  useEffect(() => {
    if (!userId) { setMsgs([]); return }
    const load = () =>
      apiFetch(`/api/messages/messages/${userId}`)
        .then(r => r.json()).then(d => setMsgs(Array.isArray(d) ? d : [])).catch(() => {})
    load()
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [userId])

  useEffect(() => {
    if (msgs.length > 0) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  useEffect(() => {
    if (userId && isPC) setTimeout(() => inputRef.current?.focus(), 100)
  }, [userId, isPC])

  useEffect(() => {
    clearTimeout(searchTimer.current)
    if (!searchQ.trim()) { setSearchUsers([]); return }
    searchTimer.current = setTimeout(() => {
      apiFetch(`/api/search?q=${encodeURIComponent(searchQ)}`)
        .then(r => r.json()).then(d => setSearchUsers(d.users ?? [])).catch(() => {})
    }, 300)
  }, [searchQ])

  async function send(overrideBody?: string) {
    const text = (overrideBody ?? body).trim()
    if (!text || !userId || sending) return
    setSending(true)
    const r = await apiFetch(`/api/messages/messages/${userId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
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

  // ── 会話リスト（左パネル / モバイル一覧） ──
  const ConvList = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontWeight: 900, fontSize: 15 }}>チャット</span>
        <button onClick={() => setShowSearch(true)}
          style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 6 }}>
          <Search size={18} />
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {convs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--muted)' }}>
            <MessageSquare size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
            <p style={{ fontSize: 13 }}>フォロー中のユーザーがいません</p>
          </div>
        )}
        {convs.map(c => (
          <button key={c.user.id} onClick={() => navigate(`/chat/${c.user.id}`)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', width: '100%', background: c.user.id === userId ? 'var(--surface2)' : 'none', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left' }}>
            <Avatar url={c.user.avatarUrl} name={c.user.name} size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{c.user.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                {c.lastMessage?.body.startsWith('[INVITE:') ? '⚔️ フリーマッチ招待' : (c.lastMessage?.body ?? 'メッセージなし')}
              </div>
            </div>
            {c.unread > 0 && (
              <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 99, fontSize: 11, fontWeight: 800, padding: '2px 7px', flexShrink: 0 }}>{c.unread}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )

  // ── メッセージパネル ──
  const MsgPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* モバイルのみ独自ヘッダー */}
      {!isPC && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 56, background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <button onClick={() => navigate('/chat')}
            style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', padding: 6, display: 'flex' }}>
            <ChevronLeft size={22} />
          </button>
          {selectedUser && <Avatar url={selectedUser.avatarUrl} name={selectedUser.name} size={32} />}
          <span style={{ fontWeight: 800, fontSize: 15 }}>{selectedUser?.name ?? '...'}</span>
        </div>
      )}
      {/* メッセージ一覧 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {msgs.map(m => {
          const mine = m.fromId === user?.id
          const inviteId = parseInvite(m.body)
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
              {inviteId ? <InviteCard roomId={inviteId} onJoin={joinInvite} /> : (
                <div style={{ maxWidth: '72%', background: mine ? 'var(--accent)' : 'var(--surface2)', color: mine ? '#fff' : 'var(--text)', borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px', padding: '9px 13px', fontSize: 14, lineHeight: 1.5, wordBreak: 'break-word' }}>
                  {m.body}
                </div>
              )}
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      {/* 入力欄 */}
      <div style={{ padding: '10px 12px', paddingBottom: 'calc(10px + env(safe-area-inset-bottom))', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexShrink: 0, background: 'var(--surface)' }}>
        <button onClick={sendInvite} disabled={inviting}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', borderRadius: 20, fontSize: 13, fontWeight: 700, background: 'rgba(20,184,166,0.15)', color: '#14b8a6', border: '1px solid rgba(20,184,166,0.3)', cursor: 'pointer', flexShrink: 0, opacity: inviting ? 0.5 : 1 }}>
          <Swords size={14} /> 招待
        </button>
        <input ref={inputRef} value={body} onChange={e => setBody(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="メッセージを入力…"
          style={{ flex: 1, minWidth: 0, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 20, padding: '9px 14px', fontSize: 15, color: 'var(--text)', outline: 'none' }} />
        <button onClick={() => send()} disabled={sending || !body.trim()}
          style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 20, padding: '8px 16px', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: sending || !body.trim() ? 0.5 : 1 }}>
          <SendIcon size={15} />
        </button>
      </div>
    </div>
  )

  // ── 空状態（PC で会話未選択） ──
  const EmptyState = (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--muted)' }}>
      <MessageSquare size={48} style={{ opacity: 0.2 }} />
      <p style={{ fontSize: 14, fontWeight: 700 }}>会話を選んでください</p>
    </div>
  )

  // ── 検索モーダル ──
  const SearchModal = showSearch ? (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', flexDirection: 'column', padding: '60px 0 0' }}
      onClick={e => { if (e.target === e.currentTarget) { setShowSearch(false); setSearchQ(''); setSearchUsers([]) } }}>
      <div style={{ background: 'var(--bg)', flex: 1, borderRadius: '20px 20px 0 0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Search size={16} color="var(--muted)" />
          <input autoFocus value={searchQ} onChange={e => setSearchQ(e.target.value)}
            placeholder="名前・ユーザーIDで検索…"
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
              <Avatar url={u.avatarUrl} name={u.name} size={40} />
              <div>
                <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{u.name}</p>
                {u.username && <p style={{ fontSize: 12, color: 'var(--muted)' }}>@{u.username}</p>}
              </div>
            </button>
          ))}
          {searchQ && searchUsers.length === 0 && <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 32, fontSize: 14 }}>見つかりません</p>}
          {!searchQ && <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 32, fontSize: 14 }}>名前・ユーザーIDで検索</p>}
        </div>
      </div>
    </div>
  ) : null

  // ── PC レイアウト ──
  if (isPC) return (
    <div style={{ display: 'flex', height: '100dvh', background: 'var(--bg)', overflow: 'hidden' }}>
      {/* PC ヘッダー（縦分割） */}
      <div style={{ width: 280, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {ConvList}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* PC 右パネルヘッダー */}
        {selectedUser && (
          <div style={{ height: 56, display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <Avatar url={selectedUser.avatarUrl} name={selectedUser.name} size={34} />
            <span style={{ fontWeight: 800, fontSize: 15 }}>{selectedUser.name}</span>
          </div>
        )}
        {userId ? MsgPanel : EmptyState}
      </div>
      {SearchModal}
    </div>
  )

  // ── モバイルレイアウト ──
  return (
    <div style={{ height: '100dvh', background: 'var(--bg)', overflow: 'hidden' }}>
      {userId ? MsgPanel : (
        <>
          <AppHeader title="チャット" right={
            <button onClick={() => setShowSearch(true)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 6 }}><Search size={20} /></button>
          } />
          <div style={{ height: 'calc(100dvh - 56px - 72px - env(safe-area-inset-bottom))', overflowY: 'auto' }}>
            {ConvList}
          </div>
        </>
      )}
      {SearchModal}
    </div>
  )
}
