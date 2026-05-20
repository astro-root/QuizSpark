import { apiFetch } from '../lib/api'
import { TITLES } from '../lib/titles'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AppHeader from '../components/AppHeader'

type Tab = 'questions' | 'users' | 'contacts' | 'announcements' | 'reports'

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
  const [allQuestions, setAllQuestions] = useState<Question[]>([])
  const [editingQ, setEditingQ] = useState<Question | null>(null)
  const [qTab, setQTab] = useState<'pending'|'approved'>('pending')
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [users, setUsers] = useState<UserSummary[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null)
  const [editRate, setEditRate] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [notifTarget, setNotifTarget] = useState<'user'|'all'>('user')
  const [notifTitle, setNotifTitle] = useState('')
  const [notifBody, setNotifBody] = useState('')
  const [notifStatus, setNotifStatus] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newBody, setNewBody] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [reports, setReports] = useState<{id:string,questionId:number,reason:string,createdAt:string,resolved:boolean,user:{id:string,name:string}}[]>([])
  const [csvStatus, setCsvStatus] = useState<'idle'|'ok'|'err'>('idle')
  const [csvMsg, setCsvMsg] = useState('')
  const csvRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (!loading && !(user as any)?.isAdmin) navigate('/') }, [user, loading])

  useEffect(() => {
    if (tab === 'questions') { fetchQuestions(); fetchAllQuestions() }
    else if (tab === 'announcements') fetchAnnouncements()
    else if (tab === 'users') fetchUsers()
    else if (tab === 'contacts') fetchContacts()
    else if (tab === 'reports') fetchReports()
  }, [tab])

  async function fetchReports() { const r = await apiFetch('/api/reports'); if (r.ok) setReports(await r.json()) }
  async function fetchQuestions() { const r = await apiFetch('/api/admin/questions'); if (r.ok) setQuestions(await r.json()) }
  async function fetchAllQuestions() { const r = await apiFetch('/api/admin/questions/all'); if (r.ok) setAllQuestions(await r.json()) }
  async function fetchAnnouncements() { const r = await apiFetch('/api/admin/announcements'); if (r.ok) setAnnouncements(await r.json()) }
  async function fetchUsers() { const r = await apiFetch('/api/admin/users'); if (r.ok) setUsers(await r.json()) }
  async function fetchContacts() { const r = await apiFetch('/api/admin/contacts'); if (r.ok) setContacts(await r.json()) }

  async function saveEdit(q: Question) {
    await apiFetch(`/api/admin/questions/${q.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: q.text, answer: q.answer, answers: [q.answer], displayAnswer: q.displayAnswer })
    })
    setEditingQ(null); fetchQuestions(); fetchAllQuestions()
  }

  async function approve(id: number) {
    await apiFetch(`/api/admin/questions/${id}/approve`, { method: 'PATCH' }); fetchQuestions()
  }
  async function deleteQ(id: number) {
    if (!confirm('削除しますか？')) return
    await apiFetch(`/api/admin/questions/${id}`, { method: 'DELETE' }); fetchQuestions()
  }
  async function addAnnouncement() {
    if (!newTitle.trim() || !newBody.trim()) return
    await apiFetch('/api/admin/announcements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newTitle, body: newBody }) })
    setNewTitle(''); setNewBody(''); fetchAnnouncements()
  }
  async function toggleAnnouncement(id: number, active: boolean) {
    await apiFetch(`/api/admin/announcements/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active }) }); fetchAnnouncements()
  }
  async function updateRate(id: string) {
    const r = await apiFetch(`/api/admin/users/${id}/rate`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ rate: editRate }) })
    if (r.ok) { alert('レートを更新しました'); fetchUserDetail(id) }
    else alert('更新失敗')
  }
  async function updateTitle(id: string) {
    const r = await apiFetch(`/api/admin/users/${id}/title`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ titleId: editTitle || null }) })
    if (r.ok) { alert('称号を更新しました'); fetchUserDetail(id) }
    else alert('更新失敗')
  }
  async function sendNotification(id: string) {
    if (!notifTitle.trim() || !notifBody.trim()) { alert('タイトルと本文を入力してください'); return }
    const userIds = notifTarget === 'all' ? 'all' : [id]
    const r = await apiFetch('/api/admin/notifications', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userIds, title: notifTitle, body: notifBody }) })
    if (r.ok) { const d = await r.json(); setNotifStatus(`✓ ${d.sent}人に送信しました`); setNotifTitle(''); setNotifBody(''); setTimeout(() => setNotifStatus(''), 3000) }
    else setNotifStatus('❌ 送信失敗')
  }
  async function fetchUserDetail(id: string) {
    const r = await apiFetch(`/api/admin/users/${id}`); if (r.ok) setSelectedUser(await r.json())
  }
  async function toggleAdmin(id: string, isAdmin: boolean) {
    if (!confirm(`管理者権限を${isAdmin ? '付与' : '剥奪'}しますか？`)) return
    await apiFetch(`/api/admin/users/${id}/admin`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isAdmin }) })
    fetchUsers(); if (selectedUser?.id === id) fetchUserDetail(id)
  }
  async function updateContactStatus(id: string, status: string) {
    await apiFetch(`/api/admin/contacts/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); fetchContacts()
  }

  async function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const text = await file.text()
    const lines = text.trim().split('\n').filter(Boolean)
    // ヘッダー行をスキップ（idから始まる行 or 問題文から始まる行）
    const dataLines = lines.filter(l => !l.startsWith('id,') && !l.startsWith('問題文,'))
    const rows = dataLines.map(line => {
      const cols = line.split(',').map(s => s.trim().replace(/^"|"$/g, '').replace(/""/g, '"'))
      const [_id, text, answer, displayAnswer, genre, altsRaw] = cols
      if (!text || !answer) return null
      const alts = altsRaw ? altsRaw.split('|').filter(Boolean) : []
      return { text, answer, displayAnswer: displayAnswer || answer, genre: genre || 'ノンジャンル', answers: [answer, ...alts] }
    }).filter(Boolean)
    if (rows.length === 0) { setCsvStatus('err'); setCsvMsg('有効な行がありません'); return }
    const r = await apiFetch('/api/questions/import', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows })
    })
    const d = await r.json()
    if (r.ok) { setCsvStatus('ok'); setCsvMsg(`${d.imported}問インポートしました`); fetchAllQuestions() }
    else { setCsvStatus('err'); setCsvMsg(d.error) }
    setTimeout(() => setCsvStatus('idle'), 4000)
    e.target.value = ''
  }

  const filteredUsers = users.filter(u =>
    u.name.includes(userSearch) || u.email?.includes(userSearch) || u.username?.includes(userSearch)
  )

  const TABS: { key: Tab; label: string }[] = [
    { key: 'questions', label: '📝 問題' },
    { key: 'users', label: '👤 ユーザー' },
    { key: 'contacts', label: `📬 問い合わせ${contacts.filter(c => c.status === 'open').length > 0 ? ` (${contacts.filter(c => c.status === 'open').length})` : ''}` },
    { key: 'announcements', label: '📢 お知らせ' },
    { key: 'reports', label: '🚩 報告' },
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
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {/* CSV操作 */}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <a href="/api/questions/export.csv" download
                style={{ padding:'8px 16px', borderRadius:9, fontSize:13, fontWeight:700,
                  background:'var(--surface2)', color:'var(--text)', border:'1px solid var(--border)',
                  textDecoration:'none', display:'inline-flex', alignItems:'center', gap:6 }}>
                📤 CSVエクスポート
              </a>
              <button onClick={() => csvRef.current?.click()}
                style={{ padding:'8px 16px', borderRadius:9, fontSize:13, fontWeight:700,
                  background:'var(--accent)', color:'#fff' }}>
                📥 CSVインポート
              </button>
              <input ref={csvRef} type="file" accept=".csv" style={{ display:'none' }} onChange={handleCsvImport} />
            </div>
            {csvStatus === 'ok' && <p style={{ fontSize:13, color:'var(--correct)', padding:'8px 12px', background:'rgba(34,197,94,0.1)', borderRadius:8 }}>✓ {csvMsg}</p>}
            {csvStatus === 'err' && <p style={{ fontSize:13, color:'var(--wrong)', padding:'8px 12px', background:'rgba(239,68,68,0.1)', borderRadius:8 }}>❌ {csvMsg}</p>}

            <div style={{ display:'flex', background:'var(--surface)', borderRadius:10, padding:3, gap:3 }}>
              {(['pending','approved'] as const).map(t => (
                <button key={t} onClick={() => setQTab(t)}
                  style={{ flex:1, padding:'8px', borderRadius:8, fontSize:13, fontWeight:700,
                    background: qTab===t ? 'var(--accent)' : 'transparent',
                    color: qTab===t ? '#fff' : 'var(--muted)' }}>
                  {t==='pending' ? `承認待ち (${questions.length})` : `承認済み (${allQuestions.filter(q=>(q as any).approved).length})`}
                </button>
              ))}
            </div>

            {qTab === 'pending' && (
              <>
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
              </>
            )}

            {qTab === 'approved' && (
              <>
                {allQuestions.filter((q:any) => q.approved).map(q => (
                  <div key={q.id} style={{ background:'var(--surface)', borderRadius:12, padding:'16px 18px', border:'1px solid var(--border)' }}>
                    {editingQ?.id === q.id ? (
                      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                        <input value={editingQ.text} onChange={e => setEditingQ({...editingQ, text:e.target.value})}
                          style={inp2} placeholder="問題文" />
                        <div style={{ display:'flex', gap:8 }}>
                          <input value={editingQ.answer} onChange={e => setEditingQ({...editingQ, answer:e.target.value})}
                            style={{...inp2, flex:1}} placeholder="答え（ひらがな）" />
                          <input value={editingQ.displayAnswer} onChange={e => setEditingQ({...editingQ, displayAnswer:e.target.value})}
                            style={{...inp2, flex:1}} placeholder="表示用の答え（漢字）" />
                        </div>
                        <div style={{ display:'flex', gap:8 }}>
                          <button onClick={() => saveEdit(editingQ)} style={{ padding:'7px 16px', borderRadius:8, fontSize:13, fontWeight:700, background:'var(--accent)', color:'#fff' }}>保存</button>
                          <button onClick={() => setEditingQ(null)} style={{ padding:'7px 16px', borderRadius:8, fontSize:13, fontWeight:700, background:'var(--surface2)', color:'var(--muted)' }}>キャンセル</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p style={{ fontWeight:600, marginBottom:4, fontSize:14 }}>{q.text}</p>
                        <p style={{ fontSize:13, color:'var(--muted)', marginBottom:10 }}>
                          表示: <span style={{ color:'var(--text)', fontWeight:700 }}>{q.displayAnswer}</span>　読み: {q.answer}
                        </p>
                        <div style={{ display:'flex', gap:8 }}>
                          <button onClick={() => setEditingQ(q)} style={{ padding:'6px 14px', borderRadius:8, fontSize:12, fontWeight:700, background:'var(--surface2)', color:'var(--text)' }}>編集</button>
                          <button onClick={() => deleteQ(q.id)} style={{ padding:'6px 14px', borderRadius:8, fontSize:12, fontWeight:700, background:'rgba(239,68,68,0.1)', color:'var(--wrong)', border:'1px solid rgba(239,68,68,0.2)' }}>削除</button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </>
            )}
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

                {/* レート・称号編集 */}
                <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:12, padding:'12px', background:'var(--surface2)', borderRadius:10, border:'1px solid var(--border)' }}>
                  <p style={{ fontWeight:800, fontSize:12, color:'var(--muted)', letterSpacing:1 }}>レート・称号編集</p>
                  <div style={{ display:'flex', gap:6 }}>
                    <input type="number" value={editRate} onChange={e => setEditRate(e.target.value)}
                      style={{ flex:1, padding:'8px 10px', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, fontSize:14, color:'var(--text)' }} />
                    <button onClick={() => updateRate(selectedUser.id)}
                      style={{ padding:'8px 14px', borderRadius:8, fontSize:12, fontWeight:700, background:'rgba(124,58,237,0.15)', color:'var(--accent)', border:'1px solid rgba(124,58,237,0.3)' }}>
                      レート更新
                    </button>
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <select value={editTitle} onChange={e => setEditTitle(e.target.value)}
                      style={{ flex:1, padding:'8px 10px', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, fontSize:13, color:'var(--text)' }}>
                      <option value="">称号なし</option>
                      {TITLES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                    <button onClick={() => updateTitle(selectedUser.id)}
                      style={{ padding:'8px 14px', borderRadius:8, fontSize:12, fontWeight:700, background:'rgba(251,191,36,0.1)', color:'var(--gold)', border:'1px solid rgba(251,191,36,0.3)' }}>
                      称号更新
                    </button>
                  </div>
                </div>
                <p style={{ fontWeight:700, fontSize:13, marginBottom:8 }}>直近の対戦</p>
                <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:200, overflowY:'auto' }}>
                  {selectedUser.battleRecords.slice(0, 10).map(r => (
                    <div key={r.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', background:'var(--surface2)', borderRadius:8 }}>
                      <span style={{ fontSize:14 }}>{r.result==='WIN'?'🥇':r.result==='LOSE'?'💀':'🎮'}</span>
                      <span style={{ flex:1, fontSize:12 }}>
                        {({'free':'フリー','mon':'m○n×','newyork':'ニューヨーク','updown':'アップダウン','by':'by','freeze':'フリーズ','mon_rest':'m○n休','swedish':'スウェーデン','divide':'ディバイド','lucky':'ラッキー','rensei':'連答付き','rengou':'連誤答付き','combo':'コンボ'} as any)[r.ruleId] ?? r.ruleId}
                      </span>
                      <span style={{ fontSize:11, color:'var(--muted)' }}>{r.correct}◯{r.wrong}×</span>
                    </div>
                  ))}
                  {selectedUser.battleRecords.length === 0 && <p style={{ color:'var(--muted)', fontSize:12, textAlign:'center', padding:12 }}>対戦履歴なし</p>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── 通知送信 ─── */}
        {tab === 'notify' && (
          <div style={{ background:'var(--surface)', borderRadius:14, padding:'20px', border:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:12, maxWidth:500 }}>
            <p style={{ fontWeight:800, fontSize:15 }}>通知を送信</p>
            <div style={{ display:'flex', gap:8 }}>
              {(['all','user'] as const).map(t => (
                <button key={t} onClick={() => setNotifTarget(t)}
                  style={{ padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:700, border:'none', cursor:'pointer',
                    background: notifTarget===t ? 'var(--accent)' : 'var(--surface2)', color: notifTarget===t ? '#fff' : 'var(--muted)' }}>
                  {t==='all' ? '全員に送信' : '特定ユーザーに送信'}
                </button>
              ))}
            </div>
            {notifTarget === 'user' && (
              <input placeholder="ユーザーIDを入力"
                style={{ padding:'10px 14px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:10, fontSize:14, color:'var(--text)' }} />
            )}
            <input value={notifTitle} onChange={e => setNotifTitle(e.target.value)} placeholder="タイトル"
              style={{ padding:'10px 14px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:10, fontSize:14, color:'var(--text)' }} />
            <textarea value={notifBody} onChange={e => setNotifBody(e.target.value)} placeholder="本文" rows={4}
              style={{ padding:'10px 14px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:10, fontSize:14, color:'var(--text)', resize:'vertical', fontFamily:'inherit' }} />
            <button onClick={() => sendNotification(notifTarget === 'all' ? 'all' : '')}
              style={{ padding:'12px', borderRadius:10, fontSize:14, fontWeight:800, background:'linear-gradient(135deg,var(--accent),var(--accent2))', color:'#fff', border:'none', cursor:'pointer' }}>
              送信
            </button>
            {notifStatus && <p style={{ fontSize:13, color: notifStatus.startsWith('✓') ? 'var(--correct)' : 'var(--wrong)' }}>{notifStatus}</p>}
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

        {tab === 'reports' && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {reports.length === 0 && <p style={{ color:'var(--muted)', textAlign:'center', padding:32 }}>未解決の報告はありません</p>}
            {reports.map(r => (
              <div key={r.id} style={{ background:'var(--surface)', borderRadius:12, padding:'14px 16px', border:'1px solid var(--border)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:12, color:'var(--muted)', marginBottom:4 }}>
                      問題ID: {r.questionId} ／ {r.user.name} ／ {new Date(r.createdAt).toLocaleDateString('ja-JP')}
                    </p>
                    <p style={{ fontSize:14, fontWeight:700 }}>{r.reason}</p>
                  </div>
                  <button onClick={async () => {
                    await apiFetch(`/api/reports/${r.id}/resolve`, { method: 'PATCH' })
                    setReports(prev => prev.filter(x => x.id !== r.id))
                  }} style={{ flexShrink:0, padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:700, background:'rgba(34,197,94,0.1)', color:'var(--correct)', border:'1px solid rgba(34,197,94,0.2)', cursor:'pointer' }}>
                    解決済み
                  </button>
                </div>
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

const inp2: React.CSSProperties = { width:'100%', padding:'9px 12px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, fontSize:13, color:'var(--text)' }
const inp: React.CSSProperties = { width:'100%', padding:'11px 14px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:9, fontSize:14, color:'var(--text)' }
