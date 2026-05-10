import { useSocketContext } from '../context/SocketContext'

export function ConnectionBanner() {
  const { connected, reconnecting } = useSocketContext()
  if (connected) return null
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: reconnecting ? '#f59e0b' : '#ef4444',
      color: '#fff', textAlign: 'center', padding: '10px',
      fontSize: 14, fontWeight: 700,
    }}>
      {reconnecting ? '⏳ 再接続中...' : '⚠️ 接続が切れました'}
    </div>
  )
}
