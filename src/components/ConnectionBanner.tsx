import { useEffect, useState } from 'react'
import { useSocketContext } from '../context/SocketContext'

export default function ConnectionBanner() {
  const { connected } = useSocketContext()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (connected) { setShow(false); return }
    // 3秒後にのみ表示（一時的な切断は無視）
    const t = setTimeout(() => setShow(true), 3000)
    return () => clearTimeout(t)
  }, [connected])

  if (!show) return null

  return (
    <div style={{ position:'fixed', bottom:20, left:'50%', transform:'translateX(-50%)',
      background:'#1e293b', border:'1px solid rgba(239,68,68,0.4)',
      color:'#f87171', borderRadius:10, padding:'10px 20px',
      fontSize:13, fontWeight:700, zIndex:9999,
      boxShadow:'0 4px 20px rgba(0,0,0,0.4)', whiteSpace:'nowrap' }}>
      ⚠️ 接続が切れました — 再接続中...
    </div>
  )
}
