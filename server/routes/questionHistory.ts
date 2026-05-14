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
