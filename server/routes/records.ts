import { Router } from 'express'
import { prisma } from '../lib/prisma'

const router = Router()

router.get('/me', async (req, res) => {
  if (!req.user) { res.status(401).json({ error: '未ログイン' }); return }
  const uid = (req.user as any).id
  const records = await prisma.battleRecord.findMany({
    where: { userId: uid },
    orderBy: { playedAt: 'desc' },
    take: 100,
  })
  const total = records.length
  const wins = records.filter(r => r.result === 'WIN').length
  const totalCorrect = records.reduce((s, r) => s + r.correct, 0)
  const totalWrong = records.reduce((s, r) => s + r.wrong, 0)
  res.json({ records, stats: { total, wins, winRate: total ? Math.round(wins/total*100) : 0, totalCorrect, totalWrong } })
})

router.delete('/me', async (req, res) => {
  if (!req.user) { res.status(401).json({ error: '未ログイン' }); return }
  const uid = (req.user as any).id
  await prisma.battleRecord.deleteMany({ where: { userId: uid } })
  res.json({ ok: true })
})
export default router
