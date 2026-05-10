import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface Question { id: number; text: string; answer: string; displayAnswer: string; createdAt: string }
interface Announcement { id: number; title: string; body: string; active: boolean; createdAt: string }

export default function AdminPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'questions'|'announcements'>('questions')
  const [questions, setQuestions] = useState<Question[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [newTitle, setNewTitle] = useState('')
  const [newBody, setNewBody] = useState('')

  useEffect(() => {
    if (!loading && !(user as any)?.isAdmin) navigate('/')
  }, [user, loading, navigate])

  useEffect(() => { fetchQuestions(); fetchAnnouncements() }, [])

  async function fetchQuestions() {
    const r = await fetch('/api/admin/questions')
    if (r.ok) setQuestions(await r.json())
  }
  async function fetchAnnouncements() {
    const r = await fetch('/api/admin/announcements')
    if (r.ok) setAnnouncements(await r.json())
  }

  async function approve(id: number) {
    await fetch(`/api/admin/questions/${id}/approve`, { method: 'PATCH' })
    setQuestions(q => q.filter(x => x.id !== id))
  }
  async function deleteQ(id: number) {
    await fetch(`/api/admin/questions/${id}`, { method: 'DELETE' })
    setQuestions(q => q.filter(x => x.id !== id))
  }
  async function toggleAnnouncement(id: number, active: boolean) {
    const r = await fetch(`/api/admin/announcements/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active }) })
    if (r.ok) setAnnouncements(a => a.map(x => x.id === id ? { ...x, active } : x))
  }
  async function deleteA(id: number) {
    await fetch(`/api/admin/announcements/${id}`, { method: 'DELETE' })
    setAnnouncements(a => a.filter(x => x.id !== id))
  }
  async function createAnnouncement() {
    if (!newTitle || !newBody) return
    const r = await fetch('/api/admin/announcements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newTitle, body: newBody }) })
    if (r.ok) { const data = await r.json(); setAnnouncements(a => [data, ...a]); setNewTitle(''); setNewBody('') }
  }

  if (loading) return null

  return (
    <div style={{ minHeight:'100vh', padding:'24px 20px' }}>
      <div style={{ maxWidth:640, margin:'0 auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <h1 style={{ fontFamily:'Orbitron,sans-serif', fontSize:20, fontWeight:900 }}>管理画面</h1>
          <button onClick={() => navigate('/')} style={{ background:'none', color:'var(--muted)', fontSize:13, padding:0 }}>← トップ</button>
        </div>

        <div style={{ display:'flex', background:'var(--surface)', borderRadius:12, padding:4, gap:4, marginBottom:20 }}>
          {(['questions','announcements'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex:1, padding:'10px', borderRadius:9, fontSize:14, fontWeight:700,
                background: tab===t ? 'var(--accent)' : 'transparent',
                color: tab===t ? '#fff' : 'var(--muted)' }}>
              {t==='questions' ? `未承認問題 (${questions.length})` : 'お知らせ'}
            </button>
          ))}
        </div>

        {tab==='questions' && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {questions.length === 0 && <p style={{ color:'var(--muted)', textAlign:'center', padding:40 }}>未承認の問題はありません</p>}
            {questions.map(q => (
              <div key={q.id} style={{ background:'var(--surface)', borderRadius:12, padding:'16px 18px' }}>
                <p style={{ fontSize:15, marginBottom:6 }}>{q.text}</p>
                <p style={{ fontSize:13, color:'var(--muted)', marginBottom:12 }}>答え: {q.displayAnswer}（{q.answer}）</p>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => approve(q.id)}
                    style={{ padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:700, background:'rgba(16,185,129,0.15)', color:'var(--correct)', border:'1px solid rgba(16,185,129,0.3)' }}>
                    承認
                  </button>
                  <button onClick={() => deleteQ(q.id)}
                    style={{ padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:700, background:'rgba(244,63,94,0.1)', color:'var(--wrong)', border:'1px solid rgba(244,63,94,0.2)' }}>
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab==='announcements' && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ background:'var(--surface)', borderRadius:12, padding:'18px 20px', marginBottom:4 }}>
              <p style={{ fontSize:13, fontWeight:700, color:'var(--muted)', marginBottom:10 }}>新しいお知らせ</p>
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="タイトル"
                style={{ width:'100%', padding:'10px 14px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, fontSize:15, color:'var(--text)', marginBottom:8 }} />
              <textarea value={newBody} onChange={e => setNewBody(e.target.value)} placeholder="本文" rows={3}
                style={{ width:'100%', padding:'10px 14px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, fontSize:14, color:'var(--text)', resize:'vertical', marginBottom:10, fontFamily:'inherit' }} />
              <button onClick={createAnnouncement}
                style={{ padding:'10px 20px', borderRadius:8, fontSize:14, fontWeight:700, background:'linear-gradient(135deg,var(--accent),var(--accent2))', color:'#fff' }}>
                投稿
              </button>
            </div>
            {announcements.map(a => (
              <div key={a.id} style={{ background:'var(--surface)', borderRadius:12, padding:'14px 18px', opacity: a.active ? 1 : 0.5 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'start', marginBottom:6 }}>
                  <p style={{ fontWeight:700, fontSize:15 }}>{a.title}</p>
                  <div style={{ display:'flex', gap:8, flexShrink:0, marginLeft:12 }}>
                    <button onClick={() => toggleAnnouncement(a.id, !a.active)}
                      style={{ padding:'4px 10px', borderRadius:6, fontSize:12, fontWeight:700, background: a.active ? 'rgba(251,191,36,0.15)' : 'rgba(16,185,129,0.15)', color: a.active ? 'var(--gold)' : 'var(--correct)', border:'none' }}>
                      {a.active ? '非表示' : '表示'}
                    </button>
                    <button onClick={() => deleteA(a.id)}
                      style={{ padding:'4px 10px', borderRadius:6, fontSize:12, fontWeight:700, background:'rgba(244,63,94,0.1)', color:'var(--wrong)', border:'none' }}>
                      削除
                    </button>
                  </div>
                </div>
                <p style={{ fontSize:13, color:'var(--sub)' }}>{a.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
