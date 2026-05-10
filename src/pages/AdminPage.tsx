import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AppHeader from '../components/AppHeader'

type Tab = 'questions' | 'users' | 'contacts' | 'announcements'

interface Question { id: number; text: string; answer: string; displayAnswer: string; createdAt: string }
interface Announcement { id: number; title: string; body: string; active: boolean }
interface UserSummary {
  id: string; name: string; username: string | null; email: string | null
  isAdmin: boolean; createdAt: string
  _count: { battleRecords: number; questionSets: number }
}
interface UserDetail extends UserSummary {
  bio: string | null
  battleRecords: { id: string; ruleId: string; result: string; correct: number; wrong: number; score: number; playerCount: number; playedAt: string }[]
  questionSets: { id: string; name: string; isPublic: boolean; _count: { items: number } }[]
}
interface Contact { id: string; userId: string | null; email: string; category: string; body: string; status: string; createdAt: string }

export default function AdminPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('questions')

  const [questions, setQuestions] = useState<Question[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [users, setUsers] = useState<UserSummary[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newBody, setNewBody] = useState('')
  const [userSearch, setUserSearch] = useState('')

  useEffect(() => { if (!loading && !(user as any)?.isAdmin) navigate('/') }, [user, loading])

  useEffect(() => {
    if (tab === 'questions') fetchQuestions()
    else if (tab === 'announcements') fetchAnnouncements()
    else if (tab === 'users') fetchUsers()
    else if (tab === 'contacts') fetchContacts()
  }, [tab])

  async function fetchQuestions() { const r = await fetch('/api/admin/questions'); if (r.ok) setQuestions(await r.json()) }
  async function fetchAnnouncements() { const r = await fetch('/api/admin/announcements'); if (r.ok) setAnnouncements(await r.json()) }
  async function fetchUsers() { const r = await fetch('/api/admin/users'); if (r.ok) setUsers(await r.json()) }
  async function fetchContacts() { const r = await fetch('/api/admin/contacts'); if (r.ok) setContacts(await r.json()) }

  async function approve(id: number) {
    await fetch(`/api/admin/questions/${id}/approve`, { method: 'PATCH' }); fetchQuestions()
  }
  async function deleteQ(id: number) {
    if (!confirm('削除しますか？')) return
    await fetch(`/api/admin/questions/${id}`, { method: 'DELETE' }); fetchQuestions()
  }
  async function addAnnouncement() {
    if (!newTitle.trim() || !newBody.trim()) return
    await fetch('/api/admin/announcements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newTitle, body: newBody }) })
    setNewTitle(''); setNewBody(''); fetchAnnouncements()
  }
  async function toggleAnnouncement(id: number, active: boolean) {
    await fetch(`/api/admin/announcements/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active }) }); fetchAnnouncements()
  }
  async function fetchUserDetail(id: string) {
    const r = await fetch(`/api/admin/users/${id}`); if (r.ok) setSelectedUser(await r.json())
  }
  async function toggleAdmin(id: string, isAdmin: boolean) {
    if (!confirm(`管理者権限を${isAdmin ? '付与' : '剥奪'}しますか？`)) return
    await fetch(`/api/admin/users/${id}/admin`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isAdmin }) })
    fetchUsers(); if (selectedUser?.id === id) fetchUserDetail(id)
  }
  async function updateContactStatus(id: string, status: string) {
    await fetch(`/api/admin/contacts/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); fetchContacts()
  }

  const filteredUsers = users.filter(u =>
    u.name.includes(userSearch) || u.email?.includes(userSearch) || u.username?.includes(userSearch)
  )

  const TABS: { key: Tab; label: string }[] = [
    { key: 'questions', label: '📝 問題' },
    { key: 'users', label: '👤 ユーザー' },
    { key: 'contacts', label: `📬 問い合わせ${contacts.filter(c => c.status === 'open').length > 0 ? ` (${contacts.filter(c => c.status === 'open').length})` : ''}` },
    { key: 'announcements', label: '📢 お知らせ' },
  ]

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column' }}>
      <AppHeader title="管理画面" />

      <div style={{ flex:1, maxWidth:900, width:'100%', margin:'0 auto', padding:'20px 16px 60px' }}>
        {/* タブ */}
        <div style={{ display:'flex', background:'var(--surface)', borderRadius:12, padding:4, gap:4, marginBottom:20, flexWrap:'wrap' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setSelectedUser(null) }}
              style={{ flex:1, minWidth:100, padding:'10px', borderRadius:9, fontSize:13, fontWeight:700,
                background: tab === t.key ? 'var(--accent)' : 'transparent',
                color: tab === t.key ? '#fff' : 'var(--muted)' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ─── 問題管理 ─── */}
        {tab === 'questions' && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {questions.length === 0 && <p style={{ color:'var(--muted)', textAlign:'center', padding:32 }}>承認待ちの問題はありません</p>}
            {questions.map(q => (
              <div key={q.id} style={{ background:'var(--surface)', borderRadius:12, padding:'16px 18px', border:'1px solid var(--border)' }}>
                <p style={{ fontWeight:600, marginBottom:6 }}>{q.text}</p>
                <p style={{ fontSize:13, color:'var(--muted)', marginBottom:12 }}>答え: {q.displayAnswer}（{q.answer}）</p>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => approve(q.id)} style={{ padding:'7px 16px', borderRadius:8, fontSize:13, fontWeight:700, background:'var(--correct)', color:'#fff' }}>承認</button>
                  <button onClick={() => deleteQ(q.id)} style={{ padding:'7px 16px', borderRadius:8, fontSize:13, fontWeight:700, background:'rgba(239,68,68,0.1)', color:'var(--wrong)', border:'1px solid rgba(239,68,68,0.2)' }}>削除</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── ユーザー管理 ─── */}
        {tab === 'users' && (
          <div style={{ display:'grid', gridTemplateColumns: selectedUser ? '1fr 1fr' : '1fr', gap:16, alignItems:'start' }}>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="名前・メール・IDで検索"
                style={{ width:'100%', padding:'11px 14px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, fontSize:14, color:'var(--text)' }} />
              <p style={{ fontSize:12, color:'var(--muted)' }}>合計 {users.length} 人</p>
              {filteredUsers.map(u => (
                <div key={u.id} onClick={() => fetchUserDetail(u.id)}
                  style={{ background:'var(--surface)', borderRadius:12, padding:'14px 16px', border:`1px solid ${selectedUser?.id === u.id ? 'var(--accent)' : 'var(--border)'}`, cursor:'pointer', transition:'border .2s' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,var(--accent),var(--accent2))', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:900, flexShrink:0 }}>
                      {u.name[0]}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <p style={{ fontWeight:700, fontSize:14 }}>{u.name}</p>
                        {u.isAdmin && <span style={{ fontSize:10, fontWeight:700, color:'var(--gold)', background:'rgba(245,158,11,0.15)', borderRadius:4, padding:'1px 6px' }}>ADMIN</span>}
                      </div>
                      <p style={{ fontSize:12, color:'var(--muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.email}</p>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <p style={{ fontSize:11, color:'var(--muted)' }}>{u._count.battleRecords}戦</p>
                      <p style={{ fontSize:11, color:'var(--muted)' }}>{new Date(u.createdAt).toLocaleDateString('ja-JP')}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedUser && (
              <div style={{ background:'var(--surface)', borderRadius:14, padding:'20px', border:'1px solid var(--border)', position:'sticky', top:20 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'start', marginBottom:16 }}>
                  <div>
                    <p style={{ fontWeight:900, fontSize:16 }}>{selectedUser.name}</p>
                    {selectedUser.username && <p style={{ fontSize:13, color:'var(--muted)' }}>@{selectedUser.username}</p>}
                    <p style={{ fontSize:12, color:'var(--muted)' }}>{selectedUser.email}</p>
                  </div>
                  <button onClick={() => setSelectedUser(null)} style={{ background:'none', color:'var(--muted)', fontSize:18, padding:0 }}>✕</button>
                </div>

                {selectedUser.bio && <p style={{ fontSize:13, color:'var(--sub)', marginBottom:12, padding:'8px 12px', background:'var(--surface2)', borderRadius:8 }}>{selectedUser.bio}</p>}

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
                  {[
                    { label:'総対戦', value: selectedUser._count.battleRecords },
                    { label:'問題セット', value: selectedUser._count.questionSets },
                    { label:'勝利', value: selectedUser.battleRecords.filter(r => r.result === 'WIN').length },
                    { label:'登録日', value: new Date(selectedUser.createdAt).toLocaleDateString('ja-JP') },
                  ].map(s => (
                    <div key={s.label} style={{ padding:'10px', background:'var(--surface2)', borderRadius:8, textAlign:'center' }}>
                      <p style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>{s.label}</p>
                      <p style={{ fontWeight:900, fontSize:16 }}>{s.value}</p>
                    </div>
                  ))}
                </div>

                <button onClick={() => toggleAdmin(selectedUser.id, !selectedUser.isAdmin)}
                  style={{ width:'100%', padding:'10px', borderRadius:9, fontSize:13, fontWeight:700, marginBottom:12,
                    background: selectedUser.isAdmin ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                    color: selectedUser.isAdmin ? 'var(--wrong)' : 'var(--gold)',
                    border: `1px solid ${selectedUser.isAdmin ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
                  {selectedUser.isAdmin ? '管理者権限を剥奪' : '管理者権限を付与'}
                </button>

                <p style={{ fontWeight:700, fontSize:13, marginBottom:8 }}>直近の対戦</p>
                <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:200, overflowY:'auto' }}>
                  {selectedUser.battleRecords.slice(0, 10).map(r => (
                    <div key={r.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', background:'var(--surface2)', borderRadius:8 }}>
                      <span style={{ fontSize:14 }}>{r.result==='WIN'?'🥇':r.result==='LOSE'?'💀':'🎮'}</span>
                      <span style={{ flex:1, fontSize:12 }}>{r.ruleId.toUpperCase()}</span>
                      <span style={{ fontSize:11, color:'var(--muted)' }}>{r.correct}◯{r.wrong}×</span>
                    </div>
                  ))}
                  {selectedUser.battleRecords.length === 0 && <p style={{ color:'var(--muted)', fontSize:12, textAlign:'center', padding:12 }}>対戦履歴なし</p>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── お問い合わせ ─── */}
        {tab === 'contacts' && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {contacts.length === 0 && <p style={{ color:'var(--muted)', textAlign:'center', padding:32 }}>お問い合わせはありません</p>}
            {contacts.map(c => (
              <div key={c.id} style={{ background:'var(--surface)', borderRadius:12, padding:'16px 18px', border:`1px solid ${c.status === 'open' ? 'rgba(56,189,248,0.3)' : 'var(--border)'}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'start', marginBottom:8 }}>
                  <div>
                    <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:4,
                      background: c.status === 'open' ? 'rgba(56,189,248,0.15)' : 'rgba(34,197,94,0.1)',
                      color: c.status === 'open' ? 'var(--accent)' : 'var(--correct)', marginRight:8 }}>
                      {c.status === 'open' ? 'OPEN' : 'CLOSED'}
                    </span>
                    <span style={{ fontSize:12, color:'var(--muted)' }}>{c.category} · {new Date(c.createdAt).toLocaleDateString('ja-JP')}</span>
                  </div>
                  <p style={{ fontSize:12, color:'var(--muted)' }}>{c.email}</p>
                </div>
                <p style={{ fontSize:14, lineHeight:1.7, marginBottom:12, whiteSpace:'pre-wrap' }}>{c.body}</p>
                <select value={c.status} onChange={e => updateContactStatus(c.id, e.target.value)}
                  style={{ padding:'6px 12px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, fontSize:13, color:'var(--text)' }}>
                  <option value="open">Open</option>
                  <option value="in_progress">対応中</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            ))}
          </div>
        )}

        {/* ─── お知らせ ─── */}
        {tab === 'announcements' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ background:'var(--surface)', borderRadius:14, padding:'18px', border:'1px solid var(--border)' }}>
              <p style={{ fontWeight:800, fontSize:14, marginBottom:12 }}>新規追加</p>
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="タイトル"
                style={{ ...inp, marginBottom:10 }} />
              <textarea value={newBody} onChange={e => setNewBody(e.target.value)} placeholder="内容" rows={3}
                style={{ ...inp, resize:'vertical', fontFamily:'inherit', lineHeight:1.6, marginBottom:12 }} />
              <button onClick={addAnnouncement}
                style={{ padding:'11px 20px', borderRadius:9, fontSize:14, fontWeight:700, background:'var(--accent)', color:'#fff' }}>
                追加
              </button>
            </div>
            {announcements.map(a => (
              <div key={a.id} style={{ background:'var(--surface)', borderRadius:12, padding:'14px 16px', border:'1px solid var(--border)', display:'flex', alignItems:'start', gap:12 }}>
                <div style={{ flex:1 }}>
                  <p style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>{a.title}</p>
                  <p style={{ fontSize:13, color:'var(--sub)' }}>{a.body}</p>
                </div>
                <button onClick={() => toggleAnnouncement(a.id, !a.active)}
                  style={{ padding:'6px 12px', borderRadius:8, fontSize:12, fontWeight:700, flexShrink:0,
                    background: a.active ? 'rgba(34,197,94,0.1)' : 'rgba(100,116,139,0.1)',
                    color: a.active ? 'var(--correct)' : 'var(--muted)',
                    border: `1px solid ${a.active ? 'rgba(34,197,94,0.2)' : 'var(--border)'}` }}>
                  {a.active ? '公開中' : '非公開'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const inp: React.CSSProperties = { width:'100%', padding:'11px 14px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:9, fontSize:14, color:'var(--text)' }
