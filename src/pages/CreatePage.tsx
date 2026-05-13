import { apiFetch } from '../lib/api'
import AppHeader from '../components/AppHeader'
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Plus, Trash2, Upload, ChevronRight, ArrowLeft } from 'lucide-react'

interface QSet { id: string; name: string; isPublic: boolean; _count: { items: number } }
interface QItem { id: number; text: string; answer: string; displayAnswer: string }

export default function CreatePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
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
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    setActiveSet(s)
    await loadItems(s.id)
    setView('detail')
  }

  async function togglePublic() {
    if (!activeSet) return
    const r = await apiFetch(`/api/question-sets/${activeSet.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: activeSet.name, isPublic: !activeSet.isPublic }),
    })
    if (r.ok) {
      const updated = { ...activeSet, isPublic: !activeSet.isPublic }
      setActiveSet(updated)
      setSets(s => s.map(x => x.id === activeSet.id ? { ...x, isPublic: !x.isPublic } : x))
    }
  }

  async function addItem() {
    if (!activeSet || !text.trim() || !answer.trim() || !displayAnswer.trim()) return
    setAdding(true)
    const r = await apiFetch(`/api/question-sets/${activeSet.id}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.trim(), answer: answer.trim(), answers: [answer.trim()], displayAnswer: displayAnswer.trim(), genre: 'ノンジャンル' }),
    })
    if (r.ok) {
      setText(''); setAnswer(''); setDisplayAnswer('')
      await loadItems(activeSet.id)
      setSets(s => s.map(x => x.id === activeSet!.id ? { ...x, _count: { items: x._count.items + 1 } } : x))
    }
    setAdding(false)
  }

  async function deleteItem(itemId: number) {
    if (!activeSet) return
    await apiFetch(`/api/question-sets/${activeSet.id}/items/${itemId}`, { method: 'DELETE' })
    setItems(prev => prev.filter(i => i.id !== itemId))
    setSets(s => s.map(x => x.id === activeSet!.id ? { ...x, _count: { items: x._count.items - 1 } } : x))
  }

  async function handleCsv(e: React.ChangeEvent<HTMLInputElement>) {
    if (!activeSet || !e.target.files?.[0]) return
    setCsvMsg('処理中...')
    const text = await e.target.files[0].text()
    const rows = text.split('\n').map(l => l.split(',')).filter(r => r.length >= 3 && r[0].trim())
    const data = rows.map(r => ({
      text: r[0].trim(), answer: r[1].trim(), answers: [r[1].trim()], displayAnswer: r[2].trim(), genre: 'ノンジャンル',
    }))
    if (data.length === 0) { setCsvMsg('有効な行が見つかりませんでした'); return }
    const r = await apiFetch(`/api/question-sets/${activeSet.id}/items/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: data }),
    })
    if (r.ok) {
      await loadItems(activeSet.id)
      setSets(s => s.map(x => x.id === activeSet!.id ? { ...x, _count: { items: items.length + data.length } } : x))
      setCsvMsg(`✅ ${data.length}問を追加しました`)
    } else { setCsvMsg('❌ アップロードに失敗しました') }
    setTimeout(() => setCsvMsg(''), 4000)
    if (fileRef.current) fileRef.current.value = ''
  }

  if (!user) return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
      ログインが必要です
    </div>
  )

  if (view === 'detail' && activeSet) return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', paddingBottom: 80 }}>
      <AppHeader title={activeSet.name}
        left={<button onClick={() => setView('list')} style={{ background: 'none', border: 'none', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}><ArrowLeft size={16} /> セット一覧</button>} />

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* 公開設定 */}
        <div style={{ background: 'var(--surface)', borderRadius: 14, padding: '14px 18px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14 }}>公開設定</p>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{activeSet.isPublic ? 'フリーマッチ一覧に表示されます' : '自分だけが使えます'}</p>
          </div>
          <button onClick={togglePublic}
            style={{ padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
              background: activeSet.isPublic ? 'var(--correct)' : 'var(--surface2)',
              color: activeSet.isPublic ? '#fff' : 'var(--muted)' }}>
            {activeSet.isPublic ? '公開中' : '非公開'}
          </button>
        </div>

        {/* 問題追加フォーム */}
        <div style={{ background: 'var(--surface)', borderRadius: 14, padding: '18px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontWeight: 800, fontSize: 14 }}>問題を追加</p>
          {[
            { label: '問題文', val: text, set: setText, ph: '例: 日本の首都はどこですか？' },
            { label: '解答（ひらがな）', val: answer, set: setAnswer, ph: '例: とうきょう' },
            { label: '解答（表示用）', val: displayAnswer, set: setDisplayAnswer, ph: '例: 東京' },
          ].map(f => (
            <div key={f.label}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>{f.label}</p>
              <input value={f.val} onChange={e => f.set(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addItem()}
                placeholder={f.ph}
                style={{ width: '100%', padding: '11px 14px', background: 'var(--surface2)', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, color: 'var(--text)', boxSizing: 'border-box' }} />
            </div>
          ))}
          <button onClick={addItem} disabled={adding || !text.trim() || !answer.trim() || !displayAnswer.trim()}
            style={{ padding: '12px', borderRadius: 10, fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer',
              background: text && answer && displayAnswer ? 'var(--accent)' : 'var(--surface2)',
              color: text && answer && displayAnswer ? '#fff' : 'var(--muted)' }}>
            {adding ? '追加中...' : '+ 追加する'}
          </button>
        </div>

        {/* CSVアップロード */}
        <div style={{ background: 'var(--surface)', borderRadius: 14, padding: '14px 18px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: 14 }}>CSVで一括追加</p>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>形式: 問題文,解答（ひらがな）,解答（表示用）</p>
            </div>
            <button onClick={() => fileRef.current?.click()}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer' }}>
              <Upload size={15} /> アップロード
            </button>
          </div>
          {csvMsg && <p style={{ fontSize: 12, marginTop: 10, color: csvMsg.startsWith('✅') ? 'var(--correct)' : csvMsg.startsWith('❌') ? 'var(--wrong)' : 'var(--muted)' }}>{csvMsg}</p>}
          <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={handleCsv} />
        </div>

        {/* 問題一覧 */}
        <div style={{ background: 'var(--surface)', borderRadius: 14, padding: '18px', border: '1px solid var(--border)' }}>
          <p style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>問題一覧 ({items.length}問)</p>
          {items.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>まだ問題がありません</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((item, i) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: 'var(--surface2)', borderRadius: 10 }}>
                <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'Orbitron,sans-serif', minWidth: 24, marginTop: 2 }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>{item.text}</p>
                  <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>答え: {item.displayAnswer}（{item.answer}）</p>
                </div>
                <button onClick={() => deleteItem(item.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--wrong)', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', paddingBottom: 80 }}>
      <AppHeader title="作問" right={
        <a href="/submit" style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', textDecoration: 'none', padding: '6px 12px' }}>
          問題を投稿する
        </a>
      } />

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* 新規セット作成 */}
        <div style={{ background: 'var(--surface)', borderRadius: 14, padding: '18px', border: '1px solid var(--border)', display: 'flex', gap: 10 }}>
          <input value={newSetName} onChange={e => setNewSetName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createSet()}
            placeholder="新しいセットの名前"
            style={{ flex: 1, padding: '11px 14px', background: 'var(--surface2)', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, color: 'var(--text)' }} />
          <button onClick={createSet} disabled={creating || !newSetName.trim()}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '11px 18px', borderRadius: 10, fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer',
              background: newSetName.trim() ? 'var(--accent)' : 'var(--surface2)',
              color: newSetName.trim() ? '#fff' : 'var(--muted)' }}>
            <Plus size={16} /> 作成
          </button>
        </div>

        {/* セット一覧 */}
        {sets.length === 0 && (
          <p style={{ color: 'var(--muted)', textAlign: 'center', fontSize: 13, padding: '32px 0' }}>
            セットがありません。上から作成してください。
          </p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sets.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)', cursor: 'pointer' }}
              onClick={() => openSet(s)}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: 15 }}>{s.name}</p>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{s._count.items}問</span>
                  <span style={{ fontSize: 11, fontWeight: 700,
                    color: s.isPublic ? 'var(--correct)' : 'var(--muted)',
                    background: s.isPublic ? 'rgba(34,197,94,0.1)' : 'var(--surface2)',
                    padding: '1px 8px', borderRadius: 10 }}>
                    {s.isPublic ? '公開' : '非公開'}
                  </span>
                </div>
              </div>
              <button onClick={e => { e.stopPropagation(); deleteSet(s.id) }}
                style={{ background: 'none', border: 'none', color: 'var(--wrong)', cursor: 'pointer', padding: 6, flexShrink: 0 }}>
                <Trash2 size={16} />
              </button>
              <ChevronRight size={18} color="var(--muted)" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
