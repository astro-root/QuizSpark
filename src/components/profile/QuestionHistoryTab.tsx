import { apiFetch } from '../../lib/api'
import { useState, useEffect } from 'react'

interface QH { id: string; text: string; answer: string; userAnswer: string; isCorrect: boolean; playedAt: string }

export default function QuestionHistoryTab() {
  const [list, setList] = useState<QH[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    apiFetch('/api/question-history/me').then(r => r.ok ? r.json() : []).then(d => { setList(d); setLoaded(true) }).catch(() => setLoaded(true))
  }, [])

  if (!loaded) return <p style={{ color:'var(--muted)', fontSize:13, textAlign:'center', padding:32 }}>読み込み中...</p>

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      <p style={{ fontSize:12, color:'var(--muted)', textAlign:'center' }}>直近10問の解答履歴</p>
      {list.length === 0 && (
        <p style={{ color:'var(--muted)', fontSize:13, textAlign:'center', padding:32 }}>履歴がありません。ランダムマッチで問題に答えると記録されます。</p>
      )}
      {list.map((q, i) => (
        <div key={q.id} style={{ background:'var(--surface)', borderRadius:14, padding:'14px 16px', border:`1px solid ${q.isCorrect ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.2)'}` }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
            <span style={{ fontSize:18, flexShrink:0, marginTop:1 }}>{q.isCorrect ? '✅' : '❌'}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:14, fontWeight:700, lineHeight:1.5, wordBreak:'break-word' }}>{q.text}</p>
              <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:4 }}>
                <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                  <span style={{ fontSize:11, color:'var(--muted)', flexShrink:0 }}>正解</span>
                  <span style={{ fontSize:13, fontWeight:800, color:'var(--correct)' }}>{q.answer}</span>
                </div>
                {!q.isCorrect && q.userAnswer && (
                  <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                    <span style={{ fontSize:11, color:'var(--muted)', flexShrink:0 }}>解答</span>
                    <span style={{ fontSize:13, fontWeight:700, color:'var(--wrong)' }}>{q.userAnswer}</span>
                  </div>
                )}
              </div>
              <p style={{ fontSize:11, color:'var(--muted)', marginTop:6 }}>
                {new Date(q.playedAt).toLocaleDateString('ja-JP')} {new Date(q.playedAt).toLocaleTimeString('ja-JP', { hour:'2-digit', minute:'2-digit' })}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
