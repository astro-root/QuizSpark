import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function SubmitPage() {
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [answer, setAnswer] = useState('')
  const [altAnswers, setAltAnswers] = useState('')
  const [displayAnswer, setDisplayAnswer] = useState('')
  const [status, setStatus] = useState<'idle'|'ok'|'err'>('idle')

  async function handleSubmit() {
    if (!text.trim() || !answer.trim() || !displayAnswer.trim()) return
    const alts = altAnswers.trim() ? altAnswers.split('、').map(s => s.trim()).filter(Boolean) : []
    const res = await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, answer, answers: [answer, ...alts], displayAnswer }),
    })
    setStatus(res.ok ? 'ok' : 'err')
    if (res.ok) { setText(''); setAnswer(''); setAltAnswers(''); setDisplayAnswer('') }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px 20px' }}>
      <div style={{ width:'100%', maxWidth:440 }}>
        <div style={{ marginBottom:24 }}>
          <button onClick={() => navigate('/')} style={{ background:'none', color:'var(--muted)', fontSize:14, padding:0 }}>← 戻る</button>
        </div>
        <h2 style={{ fontWeight:900, fontSize:20, marginBottom:24 }}>問題を投稿する</h2>

        {[
          { label:'問題文', value:text, set:setText, placeholder:'例: 日本の首都はどこですか？' },
          { label:'答え（ひらがな）', value:answer, set:setAnswer, placeholder:'例: とうきょう' },
          { label:'別解（読点区切り、任意）', value:altAnswers, set:setAltAnswers, placeholder:'例: tokyo、とうきょうと' },
          { label:'表示用の答え', value:displayAnswer, set:setDisplayAnswer, placeholder:'例: 東京' },
        ].map(f => (
          <div key={f.label} style={{ marginBottom:16 }}>
            <p style={{ fontSize:12, fontWeight:700, color:'var(--muted)', letterSpacing:1, textTransform:'uppercase', marginBottom:6 }}>{f.label}</p>
            <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
              style={{ width:'100%', padding:'13px 16px', background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:10, fontSize:16, color:'var(--text)' }} />
          </div>
        ))}

        {status === 'ok' && <p style={{ color:'var(--correct)', marginBottom:12, fontSize:14 }}>✅ 投稿しました！承認後に出題されます。</p>}
        {status === 'err' && <p style={{ color:'var(--wrong)', marginBottom:12, fontSize:14 }}>❌ 送信に失敗しました。</p>}

        <button onClick={handleSubmit}
          style={{ width:'100%', padding:'16px', borderRadius:12, fontSize:16, fontWeight:900, background:'linear-gradient(135deg,var(--accent),var(--accent2))', color:'#fff', boxShadow:'0 4px 20px rgba(99,102,241,0.4)' }}>
          投稿する
        </button>
        <p style={{ color:'var(--muted)', fontSize:12, marginTop:12, textAlign:'center' }}>投稿内容は確認後に公開されます</p>
      </div>
    </div>
  )
}
