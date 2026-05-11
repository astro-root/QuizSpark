import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

function AutoTextarea({ value, onChange, placeholder, style, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (ref.current) { ref.current.style.height = 'auto'; ref.current.style.height = ref.current.scrollHeight + 'px' }
  }, [value])
  return (
    <textarea ref={ref} value={value} onChange={onChange} placeholder={placeholder} rows={2}
      style={{ width:'100%', padding:'14px 16px', background:'var(--surface2)', border:'1.5px solid var(--border)',
        borderRadius:12, fontSize:16, color:'var(--text)', resize:'none', fontFamily:'inherit',
        lineHeight:1.7, overflow:'hidden', boxSizing:'border-box', ...style }}
      {...rest} />
  )
}

export default function SubmitPage() {
  const { user } = useAuth()
  const { theme, toggle } = useTheme()
  const [text, setText] = useState('')
  const [answer, setAnswer] = useState('')
  const [altAnswers, setAltAnswers] = useState('')
  const [displayAnswer, setDisplayAnswer] = useState('')
  const [status, setStatus] = useState<'idle'|'sending'|'ok'|'err'>('idle')
  const [showPreview, setShowPreview] = useState(false)

  const canSubmit = text.trim() && answer.trim() && displayAnswer.trim()

  async function handleSubmit() {
    if (!canSubmit || status === 'sending') return
    setStatus('sending')
    const alts = altAnswers.trim() ? altAnswers.split('、').map(s => s.trim()).filter(Boolean) : []
    const res = await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, answer, answers: [answer, ...alts], displayAnswer }),
    })
    if (res.ok) {
      setStatus('ok')
      setText(''); setAnswer(''); setAltAnswers(''); setDisplayAnswer('')
      setTimeout(() => setStatus('idle'), 3000)
    } else {
      setStatus('err')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  const fields = [
    { key:'text',          label:'問題文',              value:text,          set:setText,          placeholder:'例: 日本の首都はどこですか？',       hint:'' },
    { key:'answer',        label:'答え（ひらがな）',    value:answer,        set:setAnswer,        placeholder:'例: とうきょう',                    hint:'早押し判定に使う読み仮名' },
    { key:'altAnswers',    label:'別解（読点「、」区切り・任意）', value:altAnswers, set:setAltAnswers, placeholder:'例: tokyo、とうきょうと',         hint:'複数の読み方がある場合に追加' },
    { key:'displayAnswer', label:'表示用の答え',         value:displayAnswer, set:setDisplayAnswer, placeholder:'例: 東京',                          hint:'正解発表時に表示される' },
  ]

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column', paddingBottom:80 }}>
      {/* ヘッダー */}
      <header style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
        padding:'14px 20px', borderBottom:'1px solid var(--border)', background:'var(--surface)' }}>
        <p style={{ fontWeight:900, fontSize:18 }}>✏️ 問題を投稿</p>
        <button onClick={toggle}
          style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, padding:'6px 10px', fontSize:15 }}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </header>

      <div style={{ flex:1, maxWidth:520, width:'100%', margin:'0 auto', padding:'20px 16px', display:'flex', flexDirection:'column', gap:14 }}>

        {/* ログイン促し */}
        {!user && (
          <div style={{ padding:'12px 14px', background:'rgba(56,189,248,0.08)', border:'1px solid rgba(56,189,248,0.2)', borderRadius:12, display:'flex', gap:10, alignItems:'center' }}>
            <span style={{ fontSize:20 }}>ℹ️</span>
            <p style={{ fontSize:13, color:'var(--accent)' }}>ログインすると投稿した問題が記録されます</p>
          </div>
        )}

        {/* 成功・エラー */}
        {status === 'ok' && (
          <div style={{ padding:'14px 16px', background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)', borderRadius:12, display:'flex', gap:10, alignItems:'center' }}>
            <span style={{ fontSize:22 }}>🎉</span>
            <div>
              <p style={{ fontWeight:700, fontSize:14, color:'var(--correct)' }}>投稿しました！</p>
              <p style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>審査後に公開されます</p>
            </div>
          </div>
        )}
        {status === 'err' && (
          <div style={{ padding:'14px 16px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:12 }}>
            <p style={{ fontSize:13, color:'var(--wrong)' }}>❌ 送信に失敗しました。もう一度お試しください</p>
          </div>
        )}

        {/* 入力フォーム */}
        <div style={{ background:'var(--surface)', borderRadius:18, padding:'20px', border:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:18 }}>
          {fields.map((f, i) => (
            <div key={f.key}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
                <p style={{ fontSize:11, fontWeight:700, color:'var(--muted)', letterSpacing:1, textTransform:'uppercase' }}>{f.label}</p>
                {f.hint && <p style={{ fontSize:10, color:'var(--muted)', opacity:0.7 }}>{f.hint}</p>}
              </div>
              <AutoTextarea value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                style={{ fontSize: i === 0 ? 16 : 15 }} />
            </div>
          ))}
        </div>

        {/* プレビュー */}
        {(text || displayAnswer) && (
          <div>
            <button onClick={() => setShowPreview(v => !v)}
              style={{ fontSize:12, fontWeight:700, color:'var(--accent)', background:'none', padding:0, marginBottom:10 }}>
              {showPreview ? '▲ プレビューを閉じる' : '▼ プレビューを確認する'}
            </button>
            {showPreview && (
              <div style={{ background:'var(--surface)', borderRadius:14, padding:'18px 20px', border:'1px solid var(--accent)', display:'flex', flexDirection:'column', gap:12 }}>
                <p style={{ fontSize:11, fontWeight:700, color:'var(--accent)', letterSpacing:1 }}>PREVIEW</p>
                <p style={{ fontSize:18, lineHeight:1.8, fontWeight:500 }}>{text || '（問題文）'}</p>
                <div style={{ display:'inline-flex', gap:8, alignItems:'center', padding:'8px 16px', background:'rgba(34,197,94,0.1)', borderRadius:8, alignSelf:'flex-start' }}>
                  <span style={{ fontSize:13, color:'var(--muted)' }}>答え：</span>
                  <span style={{ fontWeight:900, fontSize:16, color:'var(--correct)' }}>{displayAnswer || '（表示用の答え）'}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ガイドライン */}
        <div style={{ background:'var(--surface)', borderRadius:14, padding:'16px 18px', border:'1px solid var(--border)' }}>
          <p style={{ fontWeight:800, fontSize:13, marginBottom:10 }}>📋 投稿のガイドライン</p>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[
              '答えはひらがな（長音符含む）で入力してください',
              '複数の読み方がある場合は別解に追加してください',
              '著作権に配慮した問題を投稿してください',
              '審査後に公開されます（数日かかる場合があります）',
            ].map(t => (
              <div key={t} style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                <span style={{ color:'var(--accent)', fontWeight:700, flexShrink:0, marginTop:1 }}>·</span>
                <p style={{ fontSize:12, color:'var(--muted)', lineHeight:1.6 }}>{t}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 送信ボタン */}
        <button onClick={handleSubmit} disabled={!canSubmit || status === 'sending'}
          style={{ width:'100%', padding:'17px', borderRadius:14, fontSize:16, fontWeight:900,
            background: canSubmit ? 'linear-gradient(135deg,var(--accent),var(--accent2))' : 'var(--surface2)',
            color: canSubmit ? '#fff' : 'var(--muted)',
            boxShadow: canSubmit ? '0 4px 20px rgba(56,189,248,0.35)' : 'none',
            transition:'all .2s' }}>
          {status === 'sending' ? '送信中...' : '✏️ 投稿する'}
        </button>
      </div>
    </div>
  )
}
