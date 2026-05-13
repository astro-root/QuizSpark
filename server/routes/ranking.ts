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
router.get('/', async (req, res) => {
  try {
    const top10 = await prisma.user.findMany({
      orderBy: { rate: 'desc' },
      take: 10,
      select: {
        id: true, name: true, username: true, avatarUrl: true, rate: true,
        _count: { select: { battleRecords: true } },
        battleRecords: { where: { result: 'WIN' }, select: { id: true } }
      }
    })
    const result = top10.map((u, i) => {
      const wins = u.battleRecords.length
      const total = u._count.battleRecords
      return { rank: i + 1, id: u.id, name: u.name, username: u.username, avatarUrl: u.avatarUrl, rate: u.rate, total, wins, winRate: total ? Math.round(wins / total * 100) : 0, ...getRankLabel(u.rate) }
    })
    const myId = (req as any).user?.id
    let myRank = null
    if (myId && !result.find(e => e.id === myId)) {
      const aboveCount = await prisma.user.count({ where: { rate: { gt: (await prisma.user.findUnique({ where: { id: myId }, select: { rate: true } }))?.rate ?? 0 } } })
      const me = await prisma.user.findUnique({
        where: { id: myId },
        select: { id: true, name: true, username: true, avatarUrl: true, rate: true, _count: { select: { battleRecords: true } }, battleRecords: { where: { result: 'WIN' }, select: { id: true } } }
      })
      if (me) {
        const wins = me.battleRecords.length
        const total = me._count.battleRecords
        myRank = { rank: aboveCount + 1, id: me.id, name: me.name, username: me.username, avatarUrl: me.avatarUrl, rate: me.rate, total, wins, winRate: total ? Math.round(wins / total * 100) : 0, ...getRankLabel(me.rate) }
      }
    }
    res.json({ top10: result, myRank })
  } catch { res.status(500).json({ error: 'サーバーエラー' }) }
})
export default router
