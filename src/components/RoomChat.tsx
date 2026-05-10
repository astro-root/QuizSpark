import { useEffect, useRef, useState } from 'react'
import { useSocketContext } from '../context/SocketContext'

interface ChatMsg {
  id: number
  playerId: string
  playerName: string
  text: string
  ts: number
}

interface Props {
  myId: string
}

export default function RoomChat({ myId }: Props) {
  const { socket, sendChat } = useSocketContext()
  const [msgs, setMsgs] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const counter = useRef(0)

  useEffect(() => {
    if (!socket) return
    const handler = (playerId: string, playerName: string, text: string, ts: number) => {
      const msg = { id: counter.current++, playerId, playerName, text, ts }
      setMsgs(prev => [...prev.slice(-99), msg])
      if (!open) setUnread(u => u + 1)
    }
    socket.on('chat-message', handler)
    return () => { socket.off('chat-message', handler) }
  }, [socket, open])

  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }, [open, msgs])

  function submit() {
    const t = input.trim()
    if (!t) return
    sendChat(t)
    setInput('')
  }

  return (
    <>
      {/* チャットトグルボタン */}
      <button onClick={() => setOpen(o => !o)}
        style={{ position:'fixed', bottom:24, right:24, width:52, height:52, borderRadius:'50%',
          background:'linear-gradient(135deg,var(--accent),var(--accent2))',
          boxShadow:'0 4px 16px rgba(56,189,248,0.4)',
          color:'#fff', fontSize:22, display:'flex', alignItems:'center', justifyContent:'center', zIndex:500 }}>
        💬
        {unread > 0 && (
          <span style={{ position:'absolute', top:-4, right:-4, width:20, height:20, borderRadius:'50%',
            background:'#ef4444', color:'#fff', fontSize:11, fontWeight:900,
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* チャットパネル */}
      {open && (
        <div style={{ position:'fixed', bottom:88, right:24, width:300, maxHeight:400,
          background:'var(--surface)', borderRadius:16, border:'1px solid var(--border)',
          boxShadow:'0 8px 32px rgba(0,0,0,0.4)', display:'flex', flexDirection:'column', zIndex:500 }}>
          <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <p style={{ fontWeight:800, fontSize:14 }}>💬 チャット</p>
            <button onClick={() => setOpen(false)} style={{ background:'none', color:'var(--muted)', fontSize:16, padding:0 }}>✕</button>
          </div>

          <div style={{ flex:1, overflowY:'auto', padding:'10px 12px', display:'flex', flexDirection:'column', gap:8, minHeight:200 }}>
            {msgs.length === 0 && (
              <p style={{ color:'var(--muted)', fontSize:13, textAlign:'center', margin:'auto' }}>まだメッセージがありません</p>
            )}
            {msgs.map(m => {
              const isMe = m.playerId === myId
              return (
                <div key={m.id} style={{ display:'flex', flexDirection:'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                  {!isMe && <p style={{ fontSize:10, color:'var(--muted)', marginBottom:2 }}>{m.playerName}</p>}
                  <div style={{ maxWidth:'80%', padding:'7px 11px', borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                    background: isMe ? 'var(--accent)' : 'var(--surface2)',
                    color: isMe ? '#fff' : 'var(--text)', fontSize:13, lineHeight:1.5, wordBreak:'break-word' }}>
                    {m.text}
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          <div style={{ padding:'10px 12px', borderTop:'1px solid var(--border)', display:'flex', gap:8 }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
              placeholder="メッセージを入力..."
              style={{ flex:1, padding:'8px 12px', background:'var(--surface2)', border:'1px solid var(--border)',
                borderRadius:8, fontSize:13, color:'var(--text)' }} />
            <button onClick={submit} disabled={!input.trim()}
              style={{ padding:'8px 12px', borderRadius:8, background:'var(--accent)', color:'#fff',
                fontSize:13, fontWeight:700, opacity: input.trim() ? 1 : 0.4 }}>
              送信
            </button>
          </div>
        </div>
      )}
    </>
  )
}
