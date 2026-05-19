import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts'

const GENRES = ['文学','歴史','地理','公民','自然科学','言葉','芸能','スポーツ','漫アゲ','音楽','生活','ノンジャンル']

interface GenreStat { genre: string; correct: number; total: number; rate: number }

export default function GenreRadarTab({ userId }: { userId?: string }) {
  const [stats, setStats] = useState<GenreStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const url = userId ? `/api/question-history/genre?userId=${userId}` : '/api/question-history/genre'
    apiFetch(url).then(r => r.ok ? r.json() : []).then(setStats).finally(() => setLoading(false))
  }, [userId])

  if (loading) return <p style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: 24 }}>読み込み中...</p>
  if (stats.every(s => s.total === 0)) return <p style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: 24 }}>対戦履歴がありません</p>

  const rawData = GENRES.map(g => {
    const s = stats.find(x => x.genre === g)
    return { genre: g, 正答率: s ? Math.round(s.rate * 100) : 0, 問題数: s?.total ?? 0 }
  }).filter(d => d['問題数'] > 0)
  // recharts RadarChartは3点未満だと描画できないのでダミー追加
  const data = rawData.length >= 3 ? rawData : [
    ...rawData,
    ...Array.from({ length: 3 - rawData.length }, (_, i) => ({ genre: `_dummy${i}`, 正答率: 0, 問題数: 0 }))
  ]

  return (
    <div style={{ padding: '16px 0' }}>
      <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', marginBottom: 12 }}>ジャンル別正答率</p>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data}>
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis dataKey="genre" tick={{ fill: 'var(--muted)', fontSize: 11 }} />
          <Radar name="正答率" dataKey="正答率" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.3} />
          <Tooltip
            contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
            formatter={(v: number, _: string, entry: any) => [`${v}% (${entry.payload['問題数']}問)`, '正答率']}
          />
        </RadarChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 12 }}>
        {data.map(d => (
          <div key={d.genre} style={{ background: 'var(--surface2)', borderRadius: 8, padding: '6px 12px', fontSize: 12 }}>
            <span style={{ color: 'var(--muted)' }}>{d.genre}</span>
            <span style={{ color: 'var(--accent)', fontWeight: 800, marginLeft: 6 }}>{d['正答率']}%</span>
            <span style={{ color: 'var(--muted)', fontSize: 10, marginLeft: 4 }}>({d['問題数']}問)</span>
          </div>
        ))}
      </div>
    </div>
  )
}
