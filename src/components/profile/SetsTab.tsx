import { useState, useRef, useEffect } from 'react'

interface QSet { id: string; name: string; description: string | null; isPublic: boolean; _count: { items: number } }
interface SetItem { id: number; text: string; displayAnswer: string }

const inp: React.CSSProperties = { width:'100%', padding:'13px 16px', background:'var(--surface2)', border:'1.5px solid var(--border)', borderRadius:10, fontSize:15, color:'var(--text)' }

export default function SetsTab() {
  const [sets, setSets] = useState<QSet[]>([])
  const [newSetName, setNewSetName] = useState('')
  const [newSetDesc, setNewSetDesc] = useState('')
  const [newSetPublic, setNewSetPublic] = useState(false)
  const [selectedSet, setSelectedSet] = useState<string | null>(null)
  const [items, setItems] = useState<SetItem[]>([])
  const [csvError, setCsvError] = useState('')
  const [csvOk, setCsvOk] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { fetchSets() }, [])

  async function fetchSets() {
    const r = await fetch('/api/question-sets/mine')
    if (r.ok) setSets(await r.json())
  }
  async function fetchItems(id: string) {
    const r = await fetch(`/api/question-sets/${id}/items`)
    if (r.ok) setItems(await r.json())
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
      if (r.ok) { setCsvOk(`${d.imported}問インポートしました`); fetchItems(selectedSet!) }
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

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
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

      {sets.map(s => (
        <div key={s.id}>
          <div onClick={() => { setSelectedSet(selectedSet===s.id ? null : s.id); if (selectedSet !== s.id) fetchItems(s.id) }}
            style={{ background:'var(--surface)', borderRadius:12, padding:'14px 16px',
              border:`1px solid ${selectedSet===s.id?'var(--accent)':'var(--border)'}`, cursor:'pointer' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <p style={{ fontWeight:700, fontSize:14 }}>{s.name}</p>
                <p style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>{s._count.items}問 · {s.isPublic ? '公開' : '非公開'}</p>
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
          {selectedSet === s.id && (
            <div style={{ background:'var(--surface)', borderRadius:'0 0 12px 12px', padding:'14px 16px',
              border:'1px solid var(--accent)', borderTopWidth:0, marginTop:-1 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <p style={{ fontWeight:700, fontSize:13 }}>問題一覧（{items.length}問）</p>
                <button onClick={() => fileRef.current?.click()}
                  style={{ padding:'6px 14px', borderRadius:8, fontSize:12, fontWeight:700, background:'var(--accent)', color:'#fff' }}>
                  CSVインポート
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
                    <button onClick={() => deleteItem(item.id)} style={{ background:'none', color:'var(--muted)', fontSize:14, padding:0 }}>✕</button>
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
  )
}
