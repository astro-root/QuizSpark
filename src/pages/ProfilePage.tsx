import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

interface SetItem { id: number; text: string; answer: string; displayAnswer: string }
interface QSet { id: string; name: string; description?: string; isPublic: boolean; _count: { items: number }; updatedAt: string }
interface Stats { total: number; wins: number; winRate: number; totalCorrect: number; totalWrong: number }
interface Record { id: string; ruleId: string; result: string; correct: number; wrong: number; score: number; playerCount: number; playedAt: string }

export default function ProfilePage() {
  const { user, loading: authLoading, updateProfile, updateAvatar, logout } = useAuth()
  const { theme, toggle: toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'profile'|'sets'|'records'>('profile')

  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [username, setUsername] = useState('')
  const [profileError, setProfileError] = useState('')
  const [profileOk, setProfileOk] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarRef = useRef<HTMLInputElement>(null)

  const [sets, setSets] = useState<QSet[]>([])
  const [newSetName, setNewSetName] = useState('')
  const [newSetDesc, setNewSetDesc] = useState('')
  const [newSetPublic, setNewSetPublic] = useState(false)
  const [selectedSet, setSelectedSet] = useState<string | null>(null)
  const [items, setItems] = useState<SetItem[]>([])
  const [csvError, setCsvError] = useState('')
  const [csvOk, setCsvOk] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const [stats, setStats] = useState<Stats | null>(null)
  const [records, setRecords] = useState<Record[]>([])

  useEffect(() => {
    if (authLoading) return
    if (!user) { navigate('/'); return }
    setName(user.name)
    setBio(user.bio ?? '')
    setUsername(user.username ?? '')
  }, [user, authLoading])

  useEffect(() => {
    if (tab === 'sets') fetchSets()
    if (tab === 'records') fetchRecords()
  }, [tab])

  useEffect(() => {
    if (selectedSet) fetchItems(selectedSet)
  }, [selectedSet])

  async function fetchSets() {
    const r = await fetch('/api/question-sets')
    if (r.ok) setSets(await r.json())
  }
  async function fetchItems(id: string) {
    const r = await fetch(`/api/question-sets/${id}/items`)
    if (r.ok) setItems(await r.json())
  }
  async function fetchRecords() {
    const r = await fetch('/api/records/me')
    if (r.ok) { const d = await r.json(); setStats(d.stats); setRecords(d.records) }
  }
  async function saveProfile() {
    setProfileError(''); setProfileOk(false)
    const err = await updateProfile(name, bio, username)
    if (err) setProfileError(err)
    else { setProfileOk(true); setTimeout(() => setProfileOk(false), 2000) }
  }
  async function createSet() {
    if (!newSetName.trim()) return
    const r = await fetch('/api/question-sets', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newSetName, description: newSetDesc, isPublic: newSetPublic })
    })
    if (r.ok) { setNewSetName(''); setNewSetDesc(''); await fetchSets() }
  }
  async function deleteSet(id: string) {
    if (!confirm('削除しますか？')) return
    await fetch(`/api/question-sets/${id}`, { method: 'DELETE' })
    if (selectedSet === id) setSelectedSet(null)
    await fetchSets()
  }
  async function togglePublic(s: QSet) {
    await fetch(`/api/question-sets/${s.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: s.name, isPublic: !s.isPublic })
    })
    await fetchSets()
  }
  function handleCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file || !selectedSet) return
    setCsvError(''); setCsvOk('')
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const text = ev.target?.result as string
      const lines = text.trim().split('\n').filter(Boolean)
      const rows = lines.map(line => {
        const cols = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''))
        const [q, ans, disp, ...alts] = cols
        if (!q || !ans) return null
        return { text: q, answer: ans, displayAnswer: disp || ans, answers: [ans, ...alts.filter(Boolean)] }
      }).filter(Boolean)
      if (rows.length === 0) { setCsvError('有効な行がありません'); return }
      const r = await fetch(`/api/question-sets/${selectedSet}/import`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows })
      })
      const d = await r.json()
      if (r.ok) { setCsvOk(`${d.imported}問インポートしました`); fetchItems(selectedSet) }
      else setCsvError(d.error)
    }
    reader.readAsText(file, 'UTF-8')
    e.target.value = ''
  }
  async function deleteItem(itemId: number) {
    if (!selectedSet) return
    await fetch(`/api/question-sets/${selectedSet}/items/${itemId}`, { method: 'DELETE' })
    fetchItems(selectedSet)
  }

  if (!user) return null

  const tabs = [
    { key: 'profile', icon: '👤', label: 'プロフィール' },
    { key: 'sets',    icon: '📚', label: '問題セット' },
    { key: 'records', icon: '🏆', label: '戦績' },
  ] as const

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column', paddingBottom:80 }}>
      {/* ヘッダー */}
      <header style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
        padding:'14px 20px', borderBottom:'1px solid var(--border)', background:'var(--surface)' }}>
        <p style={{ fontWeight:900, fontSize:18 }}>👤 マイページ</p>
        <button onClick={toggleTheme}
          style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, padding:'6px 10px', fontSize:15 }}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </header>

      {/* アバターバナー */}
      <div style={{ background:'linear-gradient(135deg,var(--accent),var(--accent2))', padding:'28px 20px 20px', display:'flex', alignItems:'center', gap:16 }}>
        <div style={{ position:'relative', flexShrink:0 }} onClick={() => avatarRef.current?.click()}>
          <div style={{ width:72, height:72, borderRadius:'50%', border:'3px solid rgba(255,255,255,0.4)',
            background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:28, fontWeight:900, color:'#fff', overflow:'hidden', cursor:'pointer' }}>
            {avatarUploading
              ? <span style={{ fontSize:20 }}>⏳</span>
              : user.avatarUrl
                ? <img src={user.avatarUrl} style={{ width:72, height:72, borderRadius:'50%', objectFit:'cover' }} alt="" />
                : user.name[0]}
          </div>
          <div style={{ position:'absolute', bottom:0, right:0, width:22, height:22, borderRadius:'50%',
            background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, boxShadow:'0 1px 4px rgba(0,0,0,0.2)' }}>
            📷
          </div>
        </div>
        <input ref={avatarRef} type="file" accept="image/*" style={{ display:'none' }}
          onChange={async e => {
            const file = e.target.files?.[0]; if (!file) return
            setAvatarUploading(true)
            await updateAvatar(file)
            setAvatarUploading(false)
            e.target.value = ''
          }} />
        <div>
          <p style={{ fontWeight:900, fontSize:20, color:'#fff' }}>{user.name}</p>
          {user.username && <p style={{ fontSize:13, color:'rgba(255,255,255,0.75)', marginTop:2 }}>@{user.username}</p>}
          <p style={{ fontSize:12, color:'rgba(255,255,255,0.6)', marginTop:2 }}>{user.email}</p>
          <p style={{ fontSize:11, color:'rgba(255,255,255,0.5)', marginTop:4 }}>アイコンをタップして変更</p>
        </div>
      </div>

      {/* タブ */}
      <div style={{ display:'flex', background:'var(--surface)', borderBottom:'1px solid var(--border)' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ flex:1, padding:'12px 8px', fontSize:13, fontWeight:700, background:'none',
              color: tab===t.key ? 'var(--accent)' : 'var(--muted)',
              borderBottom: `2px solid ${tab===t.key ? 'var(--accent)' : 'transparent'}`,
              transition:'all .2s', gap:4, display:'flex', flexDirection:'column', alignItems:'center' }}>
            <span style={{ fontSize:18 }}>{t.icon}</span>
            <span style={{ fontSize:11 }}>{t.label}</span>
          </button>
        ))}
      </div>

      <div style={{ flex:1, maxWidth:640, width:'100%', margin:'0 auto', padding:'16px 16px' }}>

        {/* ─── プロフィール ─── */}
        {tab === 'profile' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ background:'var(--surface)', borderRadius:16, padding:'20px', border:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <p style={lbl}>表示名</p>
                <input value={name} onChange={e => setName(e.target.value)} style={inp}
                  onKeyDown={e => e.key==='Enter' && saveProfile()} />
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
              {profileError && <p style={{ color:'var(--wrong)', fontSize:13, padding:'8px 12px', background:'rgba(239,68,68,0.1)', borderRadius:8 }}>{profileError}</p>}
              {profileOk && <p style={{ color:'var(--correct)', fontSize:13 }}>✓ 保存しました</p>}
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
              await fetch('/auth/account', { method: 'DELETE' })
              window.location.href = '/'
            }}
              style={{ padding:'14px', borderRadius:12, fontSize:13, fontWeight:700, background:'none', color:'var(--muted)', border:'1px solid var(--border)' }}>
              アカウントを削除する
            </button>
            <button onClick={async () => {
              if (!confirm('アカウントを削除しますか？\nこの操作は取り消せません。すべてのデータが削除されます。')) return
              if (!confirm('本当に削除しますか？')) return
              await fetch('/auth/account', { method: 'DELETE' })
              window.location.href = '/'
            }}
              style={{ padding:'14px', borderRadius:12, fontSize:13, fontWeight:700, background:'none', color:'var(--muted)', border:'1px solid var(--border)' }}>
              アカウントを削除する
            </button>
          </div>
        )}

        {/* ─── 問題セット ─── */}
        {tab === 'sets' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {/* 新規作成 */}
            <div style={{ background:'var(--surface)', borderRadius:14, padding:'18px', border:'1px solid var(--border)' }}>
              <p style={{ fontWeight:800, fontSize:14, marginBottom:12 }}>＋ 新しい問題セット</p>
              <input value={newSetName} onChange={e => setNewSetName(e.target.value)} placeholder="セット名" style={{ ...inp, marginBottom:8 }}
                onKeyDown={e => e.key==='Enter' && createSet()} />
              <input value={newSetDesc} onChange={e => setNewSetDesc(e.target.value)} placeholder="説明（任意）" style={{ ...inp, marginBottom:10 }} />
              <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'var(--sub)', marginBottom:12, cursor:'pointer' }}>
                <input type="checkbox" checked={newSetPublic} onChange={e => setNewSetPublic(e.target.checked)} />
                公開する
              </label>
              <button onClick={createSet}
                style={{ width:'100%', padding:'12px', borderRadius:10, fontSize:14, fontWeight:700, background:'var(--accent)', color:'#fff' }}>
                作成
              </button>
            </div>

            {/* セット一覧 */}
            {sets.map(s => (
              <div key={s.id}>
                <div onClick={() => setSelectedSet(selectedSet===s.id ? null : s.id)}
                  style={{ background:'var(--surface)', borderRadius:12, padding:'14px 16px',
                    border:`1px solid ${selectedSet===s.id?'var(--accent)':'var(--border)'}`, cursor:'pointer' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <p style={{ fontWeight:700, fontSize:14 }}>{s.name}</p>
                      <p style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>{s._count.items}問 · {s.isPublic ? '🌐 公開' : '🔒 非公開'}</p>
                    </div>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={e => { e.stopPropagation(); togglePublic(s) }}
                        style={{ padding:'5px 10px', borderRadius:7, fontSize:11, fontWeight:700, background:'var(--surface2)', color:'var(--sub)', border:'1px solid var(--border)' }}>
                        {s.isPublic ? '非公開に' : '公開に'}
                      </button>
                      <button onClick={e => { e.stopPropagation(); deleteSet(s.id) }}
                        style={{ padding:'5px 10px', borderRadius:7, fontSize:11, fontWeight:700, background:'rgba(239,68,68,0.1)', color:'var(--wrong)', border:'none' }}>
                        削除
                      </button>
                    </div>
                  </div>
                </div>

                {/* 展開された問題一覧 */}
                {selectedSet === s.id && (
                  <div style={{ background:'var(--surface)', borderRadius:'0 0 12px 12px', padding:'14px 16px', borderTop:'none',
                    border:'1px solid var(--accent)', borderTopWidth:0, marginTop:-1 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                      <p style={{ fontWeight:700, fontSize:13 }}>問題一覧（{items.length}問）</p>
                      <button onClick={() => fileRef.current?.click()}
                        style={{ padding:'6px 14px', borderRadius:8, fontSize:12, fontWeight:700, background:'var(--accent)', color:'#fff' }}>
                        📥 CSVインポート
                      </button>
                      <input ref={fileRef} type="file" accept=".csv" style={{ display:'none' }} onChange={handleCsv} />
                    </div>
                    {csvError && <p style={{ color:'var(--wrong)', fontSize:12, marginBottom:8, padding:'6px 10px', background:'rgba(239,68,68,0.1)', borderRadius:6 }}>{csvError}</p>}
                    {csvOk && <p style={{ color:'var(--correct)', fontSize:12, marginBottom:8 }}>✓ {csvOk}</p>}
                    <p style={{ fontSize:11, color:'var(--muted)', marginBottom:10, padding:'6px 10px', background:'var(--surface2)', borderRadius:6 }}>
                      CSV: <code>問題文,答え(ひらがな),表示用答え,別解1...</code>
                    </p>
                    <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:320, overflowY:'auto' }}>
                      {items.map(item => (
                        <div key={item.id} style={{ padding:'8px 12px', background:'var(--surface2)', borderRadius:8, display:'flex', alignItems:'start', gap:10 }}>
                          <div style={{ flex:1 }}>
                            <p style={{ fontSize:13 }}>{item.text}</p>
                            <p style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>答え: {item.displayAnswer}</p>
                          </div>
                          <button onClick={() => deleteItem(item.id)}
                            style={{ background:'none', color:'var(--muted)', fontSize:14, padding:0 }}>✕</button>
                        </div>
                      ))}
                      {items.length === 0 && <p style={{ color:'var(--muted)', fontSize:13, textAlign:'center', padding:16 }}>CSVでインポートしよう</p>}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {sets.length === 0 && <p style={{ color:'var(--muted)', fontSize:13, textAlign:'center', padding:20 }}>まだ問題セットがありません</p>}
          </div>
        )}

        {/* ─── 戦績 ─── */}
        {tab === 'records' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {stats ? (
              <>
                {/* スタッツカード */}
                <div style={{ background:'var(--surface)', borderRadius:16, padding:'20px', border:'1px solid var(--border)' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16 }}>
                    {[
                      { label:'対戦数', value:stats.total, color:'var(--text)' },
                      { label:'勝利数', value:stats.wins, color:'var(--correct)' },
                      { label:'勝率', value:`${stats.winRate}%`, color:'var(--accent)' },
                    ].map(s => (
                      <div key={s.label} style={{ textAlign:'center' }}>
                        <p style={{ fontFamily:'Orbitron,sans-serif', fontSize:26, fontWeight:900, color:s.color }}>{s.value}</p>
                        <p style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>{s.label}</p>
                      </div>
                    ))}
                  </div>
                  {/* 正解/誤答バー */}
                  <div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--muted)', marginBottom:6 }}>
                      <span>⭕ {stats.totalCorrect}問正解</span>
                      <span>❌ {stats.totalWrong}問誤答</span>
                    </div>
                    {(stats.totalCorrect + stats.totalWrong) > 0 && (
                      <div style={{ height:8, borderRadius:4, background:'var(--surface2)', overflow:'hidden' }}>
                        <div style={{ height:'100%', borderRadius:4,
                          width:`${Math.round(stats.totalCorrect/(stats.totalCorrect+stats.totalWrong)*100)}%`,
                          background:'linear-gradient(90deg,var(--correct),var(--accent))' }} />
                      </div>
                    )}
                  </div>
                </div>

                {/* 対戦履歴 */}
                <div style={{ background:'var(--surface)', borderRadius:14, padding:'16px', border:'1px solid var(--border)' }}>
                  <p style={{ fontWeight:800, fontSize:14, marginBottom:12 }}>対戦履歴</p>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {records.map(r => (
                      <div key={r.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px',
                        background:'var(--surface2)', borderRadius:10 }}>
                        <span style={{ fontSize:20, width:28, textAlign:'center' }}>
                          {r.result==='WIN'?'🥇':r.result==='LOSE'?'💀':'🎮'}
                        </span>
                        <div style={{ flex:1 }}>
                          <p style={{ fontSize:13, fontWeight:700 }}>{r.ruleId.toUpperCase()}</p>
                          <p style={{ fontSize:11, color:'var(--muted)' }}>
                            {r.playerCount}人 · {new Date(r.playedAt).toLocaleDateString('ja-JP')}
                          </p>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          <p style={{ fontSize:12, fontWeight:700,
                            color:r.result==='WIN'?'var(--correct)':r.result==='LOSE'?'var(--wrong)':'var(--muted)' }}>
                            {r.result==='WIN'?'勝利':r.result==='LOSE'?'失格':'終了'}
                          </p>
                          <p style={{ fontSize:11, color:'var(--muted)' }}>{r.correct}◯ {r.wrong}×</p>
                        </div>
                      </div>
                    ))}
                    {records.length === 0 && <p style={{ color:'var(--muted)', fontSize:13, textAlign:'center', padding:16 }}>対戦履歴がありません</p>}
                  </div>
                </div>
                <button onClick={async () => {
                  if (!confirm('戦績をすべてリセットしますか？この操作は取り消せません')) return
                  await fetch('/api/records/me', { method: 'DELETE' })
                  fetchRecords()
                }} style={{ padding:'13px', borderRadius:12, fontSize:13, fontWeight:700,
                  background:'rgba(239,68,68,0.08)', color:'var(--wrong)', border:'1px solid rgba(239,68,68,0.2)' }}>
                  🗑 戦績をリセット
                </button>
              </>
            ) : (
              <p style={{ color:'var(--muted)', fontSize:13, textAlign:'center', padding:32 }}>読み込み中...</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const lbl: React.CSSProperties = { fontSize:11, fontWeight:700, color:'var(--muted)', letterSpacing:1, textTransform:'uppercase', marginBottom:8 }
const inp: React.CSSProperties = { width:'100%', padding:'13px 16px', background:'var(--surface2)', border:'1.5px solid var(--border)', borderRadius:10, fontSize:15, color:'var(--text)' }
