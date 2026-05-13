import { Router } from 'express'
import { prisma } from '../prisma'

const router = Router()

router.get('/me', async (req, res) => {
  const userId = (req.session as any)?.passport?.user
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })
  const history = await prisma.questionHistory.findMany({
    where: { userId },
    orderBy: { playedAt: 'desc' },
    take: 10,
  })
  res.json(history)
})

export default router
