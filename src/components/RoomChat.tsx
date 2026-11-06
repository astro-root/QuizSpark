import { useEffect, useRef, useState } from 'react'
import { useSocketContext } from '../context/SocketContext'
import { Icon, IconButton } from './ui'

interface ChatMsg {
  id: number
  playerId: string
  playerName: string
  text: string
  ts: number
}

interface Props {
  myId: string
  /** true なら、開閉ボタンを呼び出し側のヘッダーなどに置く(画面の右下に浮かせない) */
  inline?: boolean
}

export default function RoomChat({ myId, inline }: Props) {
  const { socket, sendChat } = useSocketContext()
  const [msgs, setMsgs] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const counter = useRef(0)

  const openRef = useRef(false)
  useEffect(() => { openRef.current = open }, [open])

  useEffect(() => {
    if (!socket) return
    const handler = (playerId: string, playerName: string, text: string, ts: number) => {
      const msg = { id: counter.current++, playerId, playerName, text, ts }
      setMsgs(prev => [...prev.slice(-99), msg])
      if (!openRef.current) setUnread(u => u + 1)
    }
    socket.on('chat-message', handler)
    return () => { socket.off('chat-message', handler) }
  }, [socket])

  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }, [open, msgs])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function submit() {
    const t = input.trim()
    if (!t) return
    sendChat(t)
    setInput('')
  }

  const label = unread > 0 ? `チャットを開く(未読${unread}件)` : 'チャットを開く'

  return (
    <>
      {inline ? (
        <IconButton icon="message" label={label} badge={unread} variant="secondary" onClick={() => setOpen(o => !o)} aria-expanded={open} />
      ) : (
        <button className="qs-chatfab" aria-label={label} aria-expanded={open} onClick={() => setOpen(o => !o)}>
          <Icon name="message" size={22} />
          {unread > 0 && <span className="qs-badge" aria-hidden="true">{unread > 9 ? '9+' : unread}</span>}
        </button>
      )}

      {open && (
        <div className="qs-chat" role="dialog" aria-label="チャット">
          <div className="qs-chat__head">
            <span><Icon name="message" size={18} />チャット</span>
            <IconButton icon="x" label="チャットを閉じる" onClick={() => setOpen(false)} />
          </div>
          <div className="qs-chat__list" aria-live="polite">
            {msgs.length === 0 && <p className="qs-chat__empty">まだメッセージがありません</p>}
            {msgs.map(m => {
              const isMe = m.playerId === myId
              return (
                <div key={m.id} className={`qs-chat__msg${isMe ? ' qs-chat__msg--me' : ''}`}>
                  {!isMe && <small>{m.playerName}</small>}
                  <div className="qs-chat__bubble">{m.text}</div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
          <div className="qs-chat__form">
            <input value={input} onChange={e => setInput(e.target.value)} aria-label="メッセージ" maxLength={100}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit() } }}
              placeholder="メッセージを入力..." />
            <button className="qs-btn qs-btn--primary" onClick={submit} disabled={!input.trim()}>送信</button>
          </div>
        </div>
      )}
    </>
  )
}
