import { useState, useRef, useEffect } from 'react'
import AppHeader from '../components/AppHeader'
import { useAuth } from '../context/AuthContext'

function AutoTextarea({ value, onChange, placeholder, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (ref.current) { ref.current.style.height = 'auto'; ref.current.style.height = ref.current.scrollHeight + 'px' }
  }, [value])
  return (
    <textarea ref={ref} value={value} onChange={onChange} placeholder={placeholder} rows={1}
      style={{ width:'100%', padding:'13px 16px', background:'var(--surface2)', border:'1.5px solid var(--border)', borderRadius:10, fontSize:15, color:'var(--text)', resize:'none', fontFamily:'inherit', lineHeight:1.7, overflow:'hidden', ...rest.style }}
      {...rest} />
  )
}

export default function SubmitPage() {
  const { user } = useAuth()
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
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column' }}>
      <AppHeader title="問題を投稿" />
      <main style={{ flex:1, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'32px 20px 60px' }}>
        <div style={{ width:'100%', maxWidth:480, display:'flex', flexDirection:'column', gap:16 }}>

          {!user && (
            <div style={{ padding:'10px 14px', background:'rgba(56,189,248,0.08)', border:'1px solid rgba(56,189,248,0.2)', borderRadius:10 }}>
              <p style={{ fontSize:13, color:'var(--accent)' }}>ℹ️ ログインすると投稿した問題が記録されます</p>
            </div>
          )}

          <div style={{ background:'var(--surface)', borderRadius:16, padding:'24px 20px', border:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:16 }}>
            {[
              { label:'問題文', value:text, set:setText, placeholder:'例: 日本の首都はどこですか？' },
              { label:'答え（ひらがな）', value:answer, set:setAnswer, placeholder:'例: とうきょう' },
              { label:'別解（読点区切り、任意）', value:altAnswers, set:setAltAnswers, placeholder:'例: tokyo、とうきょうと' },
              { label:'表示用の答え', value:displayAnswer, set:setDisplayAnswer, placeholder:'例: 東京' },
            ].map(f => (
              <div key={f.label}>
                <p style={{ fontSize:11, fontWeight:700, color:'var(--muted)', letterSpacing:1, textTransform:'uppercase', marginBottom:8 }}>{f.label}</p>
                <AutoTextarea value={f.value} onChange={e => f.set((e.target as HTMLTextAreaElement).value)} placeholder={f.placeholder} />
              </div>
            ))}

            {status === 'ok' && <p style={{ color:'var(--correct)', fontSize:13, padding:'8px 12px', background:'rgba(34,197,94,0.1)', borderRadius:8 }}>✓ 投稿しました！審査後に公開されます</p>}
            {status === 'err' && <p style={{ color:'var(--wrong)', fontSize:13, padding:'8px 12px', background:'rgba(239,68,68,0.1)', borderRadius:8 }}>送信に失敗しました</p>}

            <button onClick={handleSubmit}
              disabled={!text.trim() || !answer.trim() || !displayAnswer.trim()}
              style={{ padding:'15px', borderRadius:12, fontSize:15, fontWeight:900,
                background:'linear-gradient(135deg,var(--accent),var(--accent2))', color:'#fff',
                opacity: (!text.trim() || !answer.trim() || !displayAnswer.trim()) ? 0.5 : 1,
                boxShadow:'0 4px 16px rgba(56,189,248,0.3)' }}>
              投稿する
            </button>
          </div>

          <div style={{ background:'var(--surface)', borderRadius:12, padding:'16px 18px', border:'1px solid var(--border)' }}>
            <p style={{ fontWeight:700, fontSize:13, marginBottom:8 }}>投稿のガイドライン</p>
            <ul style={{ color:'var(--muted)', fontSize:12, lineHeight:2, paddingLeft:16 }}>
              <li>答えはひらがな（長音符含む）で入力してください</li>
              <li>複数の読み方がある場合は別解に追加してください</li>
              <li>著作権に配慮した問題を投稿してください</li>
              <li>審査後に公開されます（数日かかる場合があります）</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}
