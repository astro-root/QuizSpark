import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const CATEGORIES = ['バグ報告', '機能要望', 'アカウントについて', 'その他']

export default function ContactPage() {
  const { user } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const [email, setEmail] = useState(user?.email ?? '')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!body.trim()) { setError('内容を入力してください'); return }
    if (!email.trim()) { setError('メールアドレスを入力してください'); return }
    setSending(true); setError('')
    const r = await fetch('/api/contact', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, category, body })
    })
    setSending(false)
    if (r.ok) setDone(true)
    else setError('送信に失敗しました。しばらく経ってから再度お試しください。')
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column' }}>
      <header style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 24px', borderBottom:'1px solid var(--border)', background:'var(--surface)' }}>
        <button onClick={() => navigate('/')} style={{ background:'none', color:'var(--muted)', fontSize:13, padding:0 }}>← ホーム</button>
        <span style={{ fontFamily:'Orbitron,sans-serif', fontWeight:900, fontSize:15, color:'var(--accent)' }}>お問い合わせ</span>
        <button onClick={toggle} style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, padding:'5px 9px', fontSize:14 }}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </header>

      <main style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'32px 20px' }}>
        <div style={{ width:'100%', maxWidth:480 }}>
          {done ? (
            <div style={{ background:'var(--surface)', borderRadius:16, padding:'40px 24px', textAlign:'center', border:'1px solid var(--border)' }}>
              <div style={{ fontSize:56, marginBottom:16 }}>✅</div>
              <p style={{ fontWeight:900, fontSize:18, marginBottom:8 }}>送信しました</p>
              <p style={{ color:'var(--muted)', fontSize:14, marginBottom:24 }}>お問い合わせありがとうございます。内容を確認後、ご連絡いたします。</p>
              <button onClick={() => navigate('/')} style={{ padding:'12px 28px', borderRadius:10, fontSize:14, fontWeight:700, background:'var(--accent)', color:'#fff' }}>
                ホームへ戻る
              </button>
            </div>
          ) : (
            <div style={{ background:'var(--surface)', borderRadius:16, padding:'28px 24px', border:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:16 }}>
              <div>
                <p style={{ fontWeight:900, fontSize:18, marginBottom:4 }}>お問い合わせ</p>
                <p style={{ color:'var(--muted)', fontSize:13 }}>ご意見・バグ報告などをお寄せください</p>
              </div>

              <div>
                <p style={lbl}>メールアドレス</p>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" style={inp} />
              </div>

              <div>
                <p style={lbl}>カテゴリ</p>
                <select value={category} onChange={e => setCategory(e.target.value)} style={inp}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <p style={lbl}>内容</p>
                <textarea value={body} onChange={e => setBody(e.target.value)} rows={6}
                  placeholder="お問い合わせ内容を詳しくご記入ください"
                  style={{ ...inp, resize:'vertical', fontFamily:'inherit', lineHeight:1.7 }} />
              </div>

              {error && <p style={{ color:'var(--wrong)', fontSize:13, padding:'8px 12px', background:'rgba(239,68,68,0.1)', borderRadius:8 }}>{error}</p>}

              <button onClick={submit} disabled={sending}
                style={{ padding:'15px', borderRadius:12, fontSize:15, fontWeight:900,
                  background:'linear-gradient(135deg,var(--accent),var(--accent2))', color:'#fff',
                  opacity: sending ? 0.6 : 1, boxShadow:'0 4px 16px rgba(56,189,248,0.3)' }}>
                {sending ? '送信中...' : '送信する'}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

const lbl: React.CSSProperties = { fontSize:11, fontWeight:700, color:'var(--muted)', letterSpacing:1, textTransform:'uppercase', marginBottom:8 }
const inp: React.CSSProperties = { width:'100%', padding:'13px 16px', background:'var(--surface2)', border:'1.5px solid var(--border)', borderRadius:10, fontSize:15, color:'var(--text)' }
