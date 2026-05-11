import { Router } from 'express'
import { prisma } from '../lib/prisma'
const router = Router()

export function getRankLabel(rate: number) {
  if (rate >= 2000) return { label: 'マスター', color: '#a855f7', emoji: '👑' }
  if (rate >= 1500) return { label: 'ダイヤ',   color: '#38bdf8', emoji: '💎' }
  if (rate >= 1200) return { label: 'プラチナ', color: '#94a3b8', emoji: '⚪' }
  if (rate >=  900) return { label: 'ゴールド',  color: '#f59e0b', emoji: '🥇' }
  if (rate >=  600) return { label: 'シルバー',  color: '#cbd5e1', emoji: '🥈' }
  return                    { label: 'ブロンズ',  color: '#b45309', emoji: '🥉' }
}

router.get('/', async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { rate: 'desc' },
    take: 10,
    select: {
      id: true, name: true, username: true, avatarUrl: true, rate: true,
      _count: { select: { battleRecords: true } },
      // 勝利数だけ集計（全件取得をやめる）
      battleRecords: { where: { result: 'WIN' }, select: { id: true } }
    }
  })
  const result = users.map((u, i) => {
    const wins = u.battleRecords.length
    const total = u._count.battleRecords
    return {
      rank: i + 1,
      id: u.id, name: u.name, username: u.username,
      avatarUrl: u.avatarUrl, rate: u.rate, total, wins,
      winRate: total ? Math.round(wins / total * 100) : 0,
      ...getRankLabel(u.rate)
    }
  })
  res.json(result)
})
export default router
