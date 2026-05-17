import { Router } from 'express'
import { prisma } from '../lib/prisma'

const router = Router()

router.get('/me', async (req, res) => {
  if (!req.user) { res.status(401).json({ error: '未ログイン' }); return }
  const userId = (req.user as any).id
  const history = await prisma.questionHistory.findMany({
    where: { userId },
    orderBy: { playedAt: 'desc' },
    take: 10,
  })
  res.json(history)
})

export default router

router.get('/genre', async (req, res) => {
  const user = (req as any).user
  const targetId = (req.query.userId as string) || user?.id
  if (!targetId) return res.status(401).json({ error: 'unauthorized' })
  const histories = await prisma.questionHistory.findMany({ where: { userId: targetId }, select: { genre: true, isCorrect: true } })
  const map = new Map<string, { correct: number; total: number }>()
  for (const h of histories) {
    const g = h.genre ?? 'ノンジャンル'
    if (!map.has(g)) map.set(g, { correct: 0, total: 0 })
    const s = map.get(g)!
    s.total++
    if (h.isCorrect) s.correct++
  }
  const result = Array.from(map.entries()).map(([genre, s]) => ({ genre, correct: s.correct, total: s.total, rate: s.total > 0 ? s.correct / s.total : 0 }))
  res.json(result)
})
