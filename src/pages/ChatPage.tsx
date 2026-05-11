import AppHeader from '../components/AppHeader'
import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface Msg { id: string; fromId: string; body: string; createdAt: string }
interface Conv { user: { id: string; name: string; avatarUrl: string | null; username: string | null }; lastMessage: Msg | null; unread: number }

export default function ChatPage() {
  const { userId } = useParams<{ userId?: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [convs, setConvs] = useState<Conv[]>([])
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/messages/conversations', { credentials: 'include' })
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

  async function send() {
    if (!body.trim() || !userId || sending) return
    setSending(true)
    const r = await fetch(`/api/messages/messages/${userId}`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body })
    })
    if (r.ok) {
      const msg = await r.json()
      setMsgs(prev => [...prev, msg])
      setBody('')
    }
    setSending(false)
  }

  const selectedUser = convs.find(c => c.user.id === userId)?.user

  return (
    <div style={{ display: 'flex', height: '100dvh', background: 'var(--bg)', maxWidth: 700, margin: '0 auto' }}>
      {/* 会話リスト */}
      {(!userId || window.innerWidth > 600) && (
        <div style={{ width: userId ? 220 : '100%', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
          <AppHeader title="チャット" back />
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
                  {c.lastMessage?.body ?? 'メッセージなし'}
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
              return (
                <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '75%', background: mine ? 'var(--accent)' : 'var(--surface2)', color: mine ? '#fff' : 'var(--text)', borderRadius: mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px', padding: '8px 12px', fontSize: 14, lineHeight: 1.5, wordBreak: 'break-word' }}>
                    {m.body}
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
          <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, paddingBottom: 'calc(10px + env(safe-area-inset-bottom))' }}>
            <input value={body} onChange={e => setBody(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder="メッセージを入力…"
              style={{ flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 20, padding: '8px 14px', fontSize: 14, color: 'var(--text)', outline: 'none' }} />
            <button onClick={send} disabled={sending || !body.trim()}
              style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 20, padding: '8px 16px', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: sending || !body.trim() ? 0.5 : 1 }}>
              送信
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
