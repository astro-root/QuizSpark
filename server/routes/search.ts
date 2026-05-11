import { Router } from 'express'
import { prisma } from '../lib/prisma'

const router = Router()

router.get('/', async (req, res) => {
  const q = String(req.query.q ?? '').trim()
  if (!q) { res.json({ users: [], sets: [] }); return }

  const [users, sets] = await Promise.all([
    prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { username: { contains: q, mode: 'insensitive' } },
        ]
      },
      select: { id: true, name: true, username: true, avatarUrl: true, rate: true },
      take: 10
    }),
    prisma.questionSet.findMany({
      where: {
        isPublic: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ]
      },
      include: { user: { select: { id: true, name: true, avatarUrl: true } }, _count: { select: { items: true } } },
      take: 10
    })
  ])

  res.json({ users, sets })
})

export default router
