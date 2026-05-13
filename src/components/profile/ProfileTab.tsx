import { apiFetch } from '../../lib/api'
import { useState, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'

const lbl: React.CSSProperties = { fontSize:11, fontWeight:700, color:'var(--muted)', letterSpacing:1, textTransform:'uppercase', marginBottom:8 }
const inp: React.CSSProperties = { width:'100%', padding:'13px 16px', background:'var(--surface2)', border:'1.5px solid var(--border)', borderRadius:10, fontSize:15, color:'var(--text)' }

export default function ProfileTab() {
  const { user, updateProfile, updateAvatar, deleteAvatar, logout } = useAuth()
  const avatarRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(user?.name ?? '')
  const [bio, setBio] = useState((user as any)?.bio ?? '')
  const [username, setUsername] = useState((user as any)?.username ?? '')
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)

  async function saveProfile() {
    setError(''); setOk(false)
    const err = await updateProfile(name, bio, username)
    if (err) setError(err)
    else { setOk(true); setTimeout(() => setOk(false), 2000) }
  }

  if (!user) return null
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ position:'relative', alignSelf:'center', marginBottom:4 }} onClick={() => avatarRef.current?.click()}>
        <div style={{ width:72, height:72, borderRadius:'50%', border:'3px solid var(--border)',
          background:'var(--surface2)', display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:28, fontWeight:900, color:'var(--text)', overflow:'hidden', cursor:'pointer' }}>
          {avatarUploading
            ? <span style={{ fontSize:20 }}>⏳</span>
            : user.avatarUrl
              ? <img src={user.avatarUrl} style={{ width:72, height:72, objectFit:'cover' }} alt="" />
              : user.name[0]}
        </div>
        <div style={{ position:'absolute', bottom:0, right:0, width:22, height:22, borderRadius:'50%',
          background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, boxShadow:'0 1px 4px rgba(0,0,0,0.2)' }}>
          📷
        </div>
      </div>
      {user.avatarUrl && (
        <button onClick={async () => { if (confirm('アバターを削除しますか？')) await deleteAvatar() }}
          style={{ alignSelf:'center', background:'none', border:'none', color:'var(--muted)', fontSize:12, cursor:'pointer', marginTop:-8 }}>
          🗑 アバターを削除
        </button>
      )}
      <input ref={avatarRef} type="file" accept="image/*" style={{ display:'none' }}
        onChange={async e => {
          const file = e.target.files?.[0]; if (!file) return
          setAvatarUploading(true)
          await updateAvatar(file)
          setAvatarUploading(false)
          e.target.value = ''
        }} />

      <div style={{ background:'var(--surface)', borderRadius:16, padding:'20px', border:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:14 }}>
        <div>
          <p style={lbl}>表示名</p>
          <input value={name} onChange={e => setName(e.target.value)} style={inp} onKeyDown={e => e.key==='Enter' && saveProfile()} />
        </div>
        <div>
          <p style={lbl}>ユーザーID</p>
          <div style={{ display:'flex', alignItems:'center', background:'var(--surface2)', border:'1.5px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
            <span style={{ padding:'13px 12px', color:'var(--muted)', fontSize:16, borderRight:'1px solid var(--border)' }}>@</span>
            <input value={username} onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g,''))} placeholder="username"
              style={{ ...inp, border:'none', borderRadius:0, background:'transparent' }} />
          </div>
          <p style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>3〜20文字、英数字・アンダースコアのみ</p>
        </div>
        <div>
          <p style={lbl}>Bio</p>
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="自己紹介を書こう"
            style={{ ...inp, resize:'vertical', fontFamily:'inherit', lineHeight:1.6 }} />
        </div>
        {error && <p style={{ color:'var(--wrong)', fontSize:13, padding:'8px 12px', background:'rgba(239,68,68,0.1)', borderRadius:8 }}>{error}</p>}
        {ok && <p style={{ color:'var(--correct)', fontSize:13 }}>✓ 保存しました</p>}
        <button onClick={saveProfile}
          style={{ padding:'14px', borderRadius:12, fontSize:15, fontWeight:900, background:'linear-gradient(135deg,var(--accent),var(--accent2))', color:'#fff' }}>
          保存する
        </button>
      </div>

      <button onClick={logout}
        style={{ padding:'14px', borderRadius:12, fontSize:14, fontWeight:700, background:'rgba(239,68,68,0.08)', color:'var(--wrong)', border:'1px solid rgba(239,68,68,0.2)' }}>
        ログアウト
      </button>
      <button onClick={async () => {
        if (!confirm('アカウントを削除しますか？\nこの操作は取り消せません。すべてのデータが削除されます。')) return
        if (!confirm('本当に削除しますか？')) return
        await apiFetch('/auth/account', { method: 'DELETE' })
        window.location.href = '/'
      }} style={{ padding:'14px', borderRadius:12, fontSize:13, fontWeight:700, background:'none', color:'var(--muted)', border:'1px solid var(--border)' }}>
        アカウントを削除する
      </button>
    </div>
  )
}
