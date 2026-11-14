import { apiFetch } from '../lib/api'
import AppHeader from '../components/AppHeader'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Avatar, Icon } from '../components/ui'
import { RANK_BANDS, bandForLabel, bandRange } from '../lib/rank'

interface Entry {
  rank: number; id: string; name: string; username: string | null
  avatarUrl: string | null; rate: number; total: number; wins: number
  winRate: number; label: string; color: string; emoji: string
}

const MEDAL_COLOR = ['#f59e0b', '#cbd5e1', '#b45309']

export default function RankingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [top10, setTop10] = useState<Entry[]>([])
  const [myRank, setMyRank] = useState<Entry | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    apiFetch('/api/ranking').then(r => r.json()).then(d => {
      setTop10(d.top10 ?? [])
      setMyRank(d.myRank ?? null)
      setLoading(false)
    }).catch(() => { setError(true); setLoading(false) })
  }, [])

  const myInTop10 = top10.find(e => e.id === user?.id)
  const displayMyRank = myInTop10 ?? myRank

  return (
    <div className="page">
      <AppHeader title="ランキング" />
      <main className="qr">
        <h1 className="qs-hide-mobile">ランキング</h1>

        {/* 自分の順位(TOP10外の場合) */}
        {displayMyRank && !myInTop10 && (
          <div className="qr-me">
            <div className="qr-me__rank">{displayMyRank.rank}</div>
            <div>
              <b>あなたの順位</b>
              <small>{displayMyRank.label} · {displayMyRank.rate} pt · 勝率{displayMyRank.winRate}%</small>
            </div>
          </div>
        )}

        {/* ランク帯 */}
        <ul className="qr-bands" aria-label="ランク帯">
          {RANK_BANDS.map(b => (
            <li key={b.label} className="qr-band">
              <Icon name={b.icon} size={14} style={{ color: b.color }} />
              {b.label} {bandRange(b)}
            </li>
          ))}
        </ul>

        {/* TOP10 */}
        {loading ? (
          <p className="qr-empty" role="status">読み込み中...</p>
        ) : error ? (
          <p className="qr-empty" role="alert">ランキングを取得できませんでした。時間をおいて再度お試しください。</p>
        ) : (
          <ol className="qr-list">
            {top10.map(e => {
              const isMe = e.id === user?.id
              const band = bandForLabel(e.label)
              return (
                <li key={e.id}>
                  <button className={`qr-row${isMe ? ' qr-row--me' : ''}`} onClick={() => navigate(`/user/${e.id}`)}>
                    <span className="qr-row__rank" style={e.rank <= 3 ? { color: MEDAL_COLOR[e.rank - 1] } : undefined}>
                      {e.rank <= 3 ? <Icon name="medal" size={24} label={`${e.rank}位`} /> : <span aria-label={`${e.rank}位`}>{e.rank}</span>}
                    </span>
                    <Avatar name={e.name} src={e.avatarUrl} size={36} />
                    <span className="qr-row__main">
                      <span className="qr-row__name">
                        <b>{e.name}</b>
                        <span className="qr-tier" style={{ '--tier': e.color } as React.CSSProperties}>
                          <Icon name={band.icon} size={12} />{e.label}
                        </span>
                      </span>
                      <span className="qr-row__sub" style={{ display: 'block' }}>{e.total}戦 {e.wins}勝 · 勝率{e.winRate}%</span>
                    </span>
                    <span className="qr-row__rate">{e.rate}<small>pt</small></span>
                  </button>
                </li>
              )
            })}
            {top10.length === 0 && <li className="qr-empty">まだランキングデータがありません</li>}
          </ol>
        )}
      </main>
    </div>
  )
}
