import { apiFetch } from '../lib/api'
import AppHeader from '../components/AppHeader'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { Plus, Trash2, Upload, ArrowLeft, Send, BookOpen, Globe, Lock } from 'lucide-react'

interface QSet { id: string; name: string; isPublic: boolean; _count: { items: number } }
interface QItem { id: number; text: string; answer: string; displayAnswer: string }

export default function CreatePage() {
  const { user } = useAuth()
  const [sets, setSets] = useState<QSet[]>([])
  const [view, setView] = useState<'list' | 'detail'>('list')
  const [activeSet, setActiveSet] = useState<QSet | null>(null)
  const [items, setItems] = useState<QItem[]>([])
  const [newSetName, setNewSetName] = useState('')
  const [creating, setCreating] = useState(false)
  const [text, setText] = useState('')
  const [answer, setAnswer] = useState('')
  const [displayAnswer, setDisplayAnswer] = useState('')
  const [adding, setAdding] = useState(false)
  const [csvMsg, setCsvMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const textRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadSets() }, [])

  async function loadSets() {
    const r = await apiFetch('/api/question-sets')
    if (r.ok) setSets(await r.json())
  }
  async function loadItems(setId: string) {
    const r = await apiFetch(`/api/question-sets/${setId}/items`)
    if (r.ok) setItems(await r.json())
  }
  async function createSet() {
    if (!newSetName.trim()) return
    setCreating(true)
    const r = await apiFetch('/api/question-sets', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newSetName.trim(), isPublic: false }),
    })
    if (r.ok) { setNewSetName(''); await loadSets() }
    setCreating(false)
  }
  async function deleteSet(id: string) {
    if (!confirm('このセットを削除しますか？')) return
    await apiFetch(`/api/question-sets/${id}`, { method: 'DELETE' })
    await loadSets()
  }
  async function openSet(s: QSet) {
    setActiveSet(s); await loadItems(s.id); setView('detail')
  }
  async function togglePublic() {
    if (!activeSet) return
    const r = await apiFetch(`/api/question-sets/${activeSet.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: activeSet.name, isPublic: !activeSet.isPublic }),
    })
    if (r.ok) {
      const updated = { ...activeSet, isPublic: !activeSet.isPublic }
      setActiveSet(updated)
      setSets(s => s.map(x => x.id === activeSet.id ? { ...x, isPublic: !x.isPublic } : x))
    }
  }
  async function addItem() {
    if (!activeSet || !text.trim() || !answer.trim()) return
    setAdding(true)
    const da = displayAnswer.trim() || answer.trim()
    const r = await apiFetch(`/api/question-sets/${activeSet.id}/items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.trim(), answer: answer.trim(), answers: [answer.trim()], displayAnswer: da, genre: 'ノンジャンル' }),
    })
    if (r.ok) {
      setText(''); setAnswer(''); setDisplayAnswer('')
      await loadItems(activeSet.id)
      setSets(s => s.map(x => x.id === activeSet!.id ? { ...x, _count: { items: x._count.items + 1 } } : x))
      setTimeout(() => textRef.current?.focus(), 50)
    }
    setAdding(false)
  }
  async function deleteItem(itemId: number) {
    if (!activeSet) return
    await apiFetch(`/api/question-sets/${activeSet.id}/items/${itemId}`, { method: 'DELETE' })
    setItems(prev => prev.filter(i => i.id !== itemId))
    setSets(s => s.map(x => x.id === activeSet!.id ? { ...x, _count: { items: x._count.items - 1 } } : x))
  }
  async function submitItem(item: QItem) {
    if (!confirm(`「${item.text}」をランダムマッチ問題として投稿しますか？審査後に公開されます。`)) return
    const r = await apiFetch('/api/questions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: item.text, answer: item.answer, answers: [item.answer], displayAnswer: item.displayAnswer, genre: 'ノンジャンル' }),
    })
    alert(r.ok ? '投稿しました。審査後にランダムマッチで出題されます。' : '投稿に失敗しました')
  }
  async function handleCsv(e: React.ChangeEvent<HTMLInputElement>) {
    if (!activeSet || !e.target.files?.[0]) return
    setCsvMsg('処理中...')
    const raw = await e.target.files[0].text()
    const rows = raw.split('\n').map(l => l.split(',')).filter(r => r.length >= 2 && r[0].trim())
    const data = rows.map(r => ({
      text: r[0].trim(), answer: r[1].trim(), answers: [r[1].trim()],
      displayAnswer: r[2]?.trim() || r[1].trim(), genre: 'ノンジャンル',
    })).filter(r => r.text && r.answer)
    if (!data.length) { setCsvMsg('有効な行が見つかりませんでした'); return }
    const r = await apiFetch(`/api/question-sets/${activeSet.id}/items/bulk`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: data }),
    })
    if (r.ok) {
      await loadItems(activeSet.id)
      setSets(s => s.map(x => x.id === activeSet!.id ? { ...x, _count: { items: x._count.items + data.length } } : x))
      setCsvMsg(`✅ ${data.length}問を追加しました`)
    } else setCsvMsg('❌ アップロードに失敗しました')
    setTimeout(() => setCsvMsg(''), 4000)
    if (fileRef.current) fileRef.current.value = ''
  }

  if (!user) return (
    <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--muted)' }}>ログインが必要です</div>
  )

  if (view === 'detail' && activeSet) return (
    <div className="page">
      <AppHeader
        title={activeSet.name}
        left={
          <button onClick={() => setView('list')}
            style={{ background:'none', border:'none', color:'var(--text)', display:'flex', alignItems:'center', gap:4, fontSize:14, fontWeight:700, cursor:'pointer' }}>
            <ArrowLeft size={18} /> 一覧
          </button>
        }
      />
      <div className="inner" style={{ display:'flex', flexDirection:'column', gap:14, paddingBottom:32 }}>

        {/* 公開設定 */}
        <div style={{ background:'var(--surface)', borderRadius:14, padding:'14px 16px', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {activeSet.isPublic
              ? <Globe size={18} color="var(--correct)" />
              : <Lock size={18} color="var(--muted)" />}
            <div>
              <p style={{ fontWeight:800, fontSize:13 }}>{activeSet.isPublic ? 'フリーマッチで公開中' : '自分だけ使える'}</p>
              <p style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>
                {activeSet.isPublic ? '他のユーザーがフリーマッチでこのセットを選べます' : '自分のフリーマッチルームでのみ使用できます'}
              </p>
            </div>
          </div>
          <button onClick={togglePublic}
            style={{ padding:'8px 14px', borderRadius:20, fontSize:12, fontWeight:800, border:'none', cursor:'pointer', flexShrink:0,
              background: activeSet.isPublic ? 'rgba(16,185,129,0.15)' : 'var(--surface2)',
              color: activeSet.isPublic ? 'var(--correct)' : 'var(--muted)' }}>
            {activeSet.isPublic ? '公開中' : '非公開'}
          </button>
        </div>

        {/* 問題追加フォーム */}
        <div style={{ background:'var(--surface)', borderRadius:14, border:'1px solid var(--border)', overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', fontWeight:800, fontSize:14, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span>問題を追加</span>
            <button onClick={() => fileRef.current?.click()}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:8, fontSize:12, fontWeight:700, background:'var(--surface2)', border:'1px solid var(--border)', color:'var(--sub)', cursor:'pointer' }}>
              <Upload size={12} /> CSV
            </button>
          </div>
          <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:10 }}>
            <input ref={textRef} value={text} onChange={e => setText(e.target.value)}
              placeholder="問題文（例: 日本の首都は？）"
              style={{ width:'100%', padding:'11px 14px', background:'var(--surface2)', border:'1.5px solid var(--border)', borderRadius:10, fontSize:14, color:'var(--text)', boxSizing:'border-box' }} />
            <div style={{ display:'flex', gap:8 }}>
              <input value={answer} onChange={e => setAnswer(e.target.value)}
                placeholder="読み（とうきょう）"
                style={{ flex:1, padding:'11px 14px', background:'var(--surface2)', border:'1.5px solid var(--border)', borderRadius:10, fontSize:14, color:'var(--text)' }} />
              <input value={displayAnswer} onChange={e => setDisplayAnswer(e.target.value)}
                placeholder="表示（東京）省略可"
                style={{ flex:1, padding:'11px 14px', background:'var(--surface2)', border:'1.5px solid var(--border)', borderRadius:10, fontSize:14, color:'var(--text)' }} />
            </div>
            <button onClick={addItem} disabled={adding || !text.trim() || !answer.trim()}
              style={{ padding:'12px', borderRadius:10, fontSize:14, fontWeight:800, border:'none', cursor:'pointer',
                background: text && answer ? 'linear-gradient(135deg,var(--accent),var(--accent2))' : 'var(--surface2)',
                color: text && answer ? '#fff' : 'var(--muted)', opacity: adding ? 0.7 : 1 }}>
              {adding ? '追加中...' : '＋ 追加'}
            </button>
          </div>
          {csvMsg && <p style={{ padding:'0 16px 12px', fontSize:12, color: csvMsg.startsWith('✅') ? 'var(--correct)' : csvMsg === '処理中...' ? 'var(--muted)' : 'var(--wrong)' }}>{csvMsg}</p>}
          <input ref={fileRef} type="file" accept=".csv" style={{ display:'none' }} onChange={handleCsv} />
        </div>

        {/* 問題一覧 */}
        <div style={{ background:'var(--surface)', borderRadius:14, border:'1px solid var(--border)', overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', fontWeight:800, fontSize:14 }}>
            問題一覧 <span style={{ fontWeight:400, fontSize:12, color:'var(--muted)' }}>({items.length}問)</span>
          </div>
          {items.length === 0 ? (
            <p style={{ textAlign:'center', padding:'32px 0', color:'var(--muted)', fontSize:13 }}>まだ問題がありません</p>
          ) : (
            <div>
              {items.map((item, i) => (
                <div key={item.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 16px', borderBottom: i < items.length-1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize:11, color:'var(--muted)', fontFamily:'Orbitron,sans-serif', minWidth:20, textAlign:'center', flexShrink:0 }}>{i+1}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.text}</p>
                    <p style={{ fontSize:11, color:'var(--muted)', marginTop:1 }}>{item.displayAnswer} <span style={{ opacity:0.5 }}>({item.answer})</span></p>
                  </div>
                  <button onClick={() => submitItem(item)} title="ランダムマッチに投稿"
                    style={{ background:'none', border:'none', color:'var(--accent)', cursor:'pointer', padding:6, opacity:0.6 }}>
                    <Send size={13} />
                  </button>
                  <button onClick={() => deleteItem(item.id)}
                    style={{ background:'none', border:'none', color:'var(--wrong)', cursor:'pointer', padding:6 }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="page">
      <AppHeader title="作問" />
      <div className="inner" style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div style={{ background:'var(--surface)', borderRadius:14, padding:'14px 16px', border:'1px solid var(--border)', display:'flex', gap:10 }}>
          <input value={newSetName} onChange={e => setNewSetName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createSet()}
            placeholder="新しいセットの名前"
            style={{ flex:1, padding:'11px 14px', background:'var(--surface2)', border:'1.5px solid var(--border)', borderRadius:10, fontSize:14, color:'var(--text)' }} />
          <button onClick={createSet} disabled={creating || !newSetName.trim()}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'11px 16px', borderRadius:10, fontSize:14, fontWeight:800, border:'none', cursor:'pointer',
              background: newSetName.trim() ? 'linear-gradient(135deg,var(--accent),var(--accent2))' : 'var(--surface2)',
              color: newSetName.trim() ? '#fff' : 'var(--muted)' }}>
            <Plus size={16} /> 作成
          </button>
        </div>

        {sets.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 0', color:'var(--muted)' }}>
            <BookOpen size={36} style={{ margin:'0 auto 12px', display:'block', opacity:0.3 }} />
            <p style={{ fontSize:14, fontWeight:700 }}>セットがありません</p>
            <p style={{ fontSize:12, marginTop:6, opacity:0.7 }}>上から新しいセットを作成してください</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {sets.map(s => (
              <div key={s.id} onClick={() => openSet(s)}
                style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', background:'var(--surface)', borderRadius:14, border:'1px solid var(--border)', cursor:'pointer' }}>
                <div style={{ width:40, height:40, borderRadius:12, background:'rgba(124,58,237,0.12)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <BookOpen size={18} color="var(--accent)" />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontWeight:800, fontSize:15, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.name}</p>
                  <div style={{ display:'flex', gap:8, marginTop:3, alignItems:'center' }}>
                    <span style={{ fontSize:12, color:'var(--muted)' }}>{s._count.items}問</span>
                    {s.isPublic && (
                      <span style={{ fontSize:11, fontWeight:700, color:'var(--correct)', background:'rgba(16,185,129,0.1)', padding:'1px 8px', borderRadius:10 }}>公開中</span>
                    )}
                  </div>
                </div>
                <button onClick={e => { e.stopPropagation(); deleteSet(s.id) }}
                  style={{ background:'none', border:'none', color:'var(--wrong)', cursor:'pointer', padding:6, flexShrink:0, opacity:0.7 }}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
