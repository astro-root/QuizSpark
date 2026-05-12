import { apiFetch } from '../../lib/api'
import { useState, useEffect } from 'react'

interface Stats { total: number; wins: number; winRate: number; totalCorrect: number; totalWrong: number }
interface Record { id: string; result: string; ruleId: string; playerCount: number; playedAt: string; correct: number; wrong: number }

export default function RecordsTab() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [records, setRecords] = useState<Record[]>([])

  useEffect(() => { fetchRecords() }, [])

  async function fetchRecords() {
    const r = await apiFetch('/api/records/me')
    if (r.ok) { const d = await r.json(); setStats(d.stats); setRecords(d.records) }
  }

  if (!stats) return <p style={{ color:'var(--muted)', fontSize:13, textAlign:'center', padding:32 }}>読み込み中...</p>

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ background:'var(--surface)', borderRadius:16, padding:'20px', border:'1px solid var(--border)' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16 }}>
          {[
            { label:'対戦数', value: stats.total, color:'var(--text)' },
            { label:'勝利数', value: stats.wins, color:'var(--correct)' },
            { label:'勝率', value: `${stats.winRate}%`, color:'var(--accent)' },
          ].map(s => (
            <div key={s.label} style={{ textAlign:'center' }}>
              <p style={{ fontFamily:'Orbitron,sans-serif', fontSize:26, fontWeight:900, color:s.color }}>{s.value}</p>
              <p style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>{s.label}</p>
            </div>
          ))}
        </div>
        {(stats.totalCorrect + stats.totalWrong) > 0 && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--muted)', marginBottom:6 }}>
              <span>{stats.totalCorrect}問正解</span>
              <span>{stats.totalWrong}問誤答</span>
            </div>
            <div style={{ height:8, borderRadius:4, background:'var(--surface2)', overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:4,
                width:`${Math.round(stats.totalCorrect/(stats.totalCorrect+stats.totalWrong)*100)}%`,
                background:'linear-gradient(90deg,var(--correct),var(--accent))' }} />
            </div>
          </div>
        )}
      </div>

      <div style={{ background:'var(--surface)', borderRadius:14, padding:'16px', border:'1px solid var(--border)' }}>
        <p style={{ fontWeight:800, fontSize:14, marginBottom:12 }}>対戦履歴</p>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {records.map(r => (
            <div key={r.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px',
              background:'var(--surface2)', borderRadius:10 }}>
              <span style={{ fontSize:20, width:28, textAlign:'center' }}>
                {r.result==='WIN' ? '🥇' : r.result==='LOSE' ? '💀' : '🎮'}
              </span>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:13, fontWeight:700 }}>{r.ruleId.toUpperCase()}</p>
                <p style={{ fontSize:11, color:'var(--muted)' }}>
                  {r.playerCount}人 · {new Date(r.playedAt).toLocaleDateString('ja-JP')}
                </p>
              </div>
              <div style={{ textAlign:'right' }}>
                <p style={{ fontSize:12, fontWeight:700,
                  color:r.result==='WIN'?'var(--correct)':r.result==='LOSE'?'var(--wrong)':'var(--muted)' }}>
                  {r.result==='WIN'?'勝利':r.result==='LOSE'?'失格':'終了'}
                </p>
                <p style={{ fontSize:11, color:'var(--muted)' }}>{r.correct}◯ {r.wrong}×</p>
              </div>
            </div>
          ))}
          {records.length === 0 && <p style={{ color:'var(--muted)', fontSize:13, textAlign:'center', padding:16 }}>対戦履歴がありません</p>}
        </div>
      </div>

      <button onClick={async () => {
        if (!confirm('戦績をすべてリセットしますか？この操作は取り消せません')) return
        await apiFetch('/api/records/me', { method: 'DELETE' })
        fetchRecords()
      }} style={{ padding:'13px', borderRadius:12, fontSize:13, fontWeight:700,
        background:'rgba(239,68,68,0.08)', color:'var(--wrong)', border:'1px solid rgba(239,68,68,0.2)' }}>
        戦績をリセット
      </button>
    </div>
  )
}
