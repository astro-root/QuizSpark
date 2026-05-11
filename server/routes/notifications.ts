import { Router } from 'express'
import { prisma } from '../lib/prisma'

const router = Router()

// 通知一覧
router.get('/', async (req, res) => {
  const me = (req.user as any)?.id
  if (!me) { res.status(401).json({ error: 'unauthorized' }); return }
  const notes = await prisma.notification.findMany({
    where: { userId: me },
    orderBy: { createdAt: 'desc' },
    take: 50
  })
  res.json(notes)
})

// 全既読
router.post('/read-all', async (req, res) => {
  const me = (req.user as any)?.id
  if (!me) { res.status(401).json({ error: 'unauthorized' }); return }
  await prisma.notification.updateMany({ where: { userId: me, read: false }, data: { read: true } })
  res.json({ ok: true })
})

// 未読数
router.get('/unread', async (req, res) => {
  const me = (req.user as any)?.id
  if (!me) { res.status(401).json({ error: 'unauthorized' }); return }
  const count = await prisma.notification.count({ where: { userId: me, read: false } })
  res.json({ count })
})

export default router
