import { Router } from 'express'
import { prisma } from '../lib/prisma'

const router = Router()

router.get('/', async (req, res) => {
  const me = (req.user as any)?.id
  if (!me) { res.status(401).json({ error: 'unauthorized' }); return }
  try {
    const notes = await prisma.notification.findMany({
      where: { userId: me },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
    res.json(notes)
  } catch { res.status(500).json({ error: 'サーバーエラー' }) }
})

router.post('/read-all', async (req, res) => {
  const me = (req.user as any)?.id
  if (!me) { res.status(401).json({ error: 'unauthorized' }); return }
  try {
    await prisma.notification.updateMany({ where: { userId: me, read: false }, data: { read: true } })
    res.json({ ok: true })
  } catch { res.status(500).json({ error: 'サーバーエラー' }) }
})

router.get('/unread', async (req, res) => {
  const me = (req.user as any)?.id
  if (!me) { res.status(401).json({ error: 'unauthorized' }); return }
  try {
    const count = await prisma.notification.count({ where: { userId: me, read: false } })
    res.json({ count })
  } catch { res.status(500).json({ error: 'サーバーエラー' }) }
})

export default router
