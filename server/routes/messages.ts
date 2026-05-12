import { Router } from 'express'
import { prisma } from '../lib/prisma'

const router = Router()

router.get('/conversations', async (req, res) => {
  const me = (req.user as any)?.id
  if (!me) { res.status(401).json({ error: 'unauthorized' }); return }
  try {
    const following = await prisma.follow.findMany({
      where: { followerId: me },
      include: { following: { select: { id: true, name: true, avatarUrl: true, username: true } } }
    })
    const convs = await Promise.all(following.map(async f => {
      const last = await prisma.directMessage.findFirst({
        where: { OR: [{ fromId: me, toId: f.followingId }, { fromId: f.followingId, toId: me }] },
        orderBy: { createdAt: 'desc' }
      })
      const unread = await prisma.directMessage.count({
        where: { fromId: f.followingId, toId: me, read: false }
      })
      return { user: f.following, lastMessage: last, unread }
    }))
    convs.sort((a, b) => (b.lastMessage?.createdAt?.getTime() ?? 0) - (a.lastMessage?.createdAt?.getTime() ?? 0))
    res.json(convs)
  } catch { res.status(500).json({ error: 'サーバーエラー' }) }
})

router.get('/messages/:userId', async (req, res) => {
  const me = (req.user as any)?.id
  if (!me) { res.status(401).json({ error: 'unauthorized' }); return }
  const other = req.params.userId
  try {
    const messages = await prisma.directMessage.findMany({
      where: { OR: [{ fromId: me, toId: other }, { fromId: other, toId: me }] },
      orderBy: { createdAt: 'asc' },
      take: 100
    })
    await prisma.directMessage.updateMany({
      where: { fromId: other, toId: me, read: false },
      data: { read: true }
    })
    res.json(messages)
  } catch { res.status(500).json({ error: 'サーバーエラー' }) }
})

router.post('/messages/:userId', async (req, res) => {
  const me = (req.user as any)?.id
  if (!me) { res.status(401).json({ error: 'unauthorized' }); return }
  const toId = req.params.userId
  const { body } = req.body ?? {}
  if (!body?.trim()) { res.status(400).json({ error: 'メッセージを入力してください' }); return }
  if (body.trim().length > 500) { res.status(400).json({ error: 'メッセージは500文字以内です' }); return }
  try {
    const target = await prisma.user.findUnique({ where: { id: toId }, select: { id: true } })
    if (!target) { res.status(404).json({ error: 'ユーザーが見つかりません' }); return }
    const msg = await prisma.directMessage.create({
      data: { fromId: me, toId, body: body.trim() }
    })
    await prisma.notification.create({
      data: { userId: toId, type: 'dm', fromId: me, data: body.trim().slice(0, 50) }
    }).catch(() => {})
    res.json(msg)
  } catch { res.status(500).json({ error: 'サーバーエラー' }) }
})

router.get('/unread', async (req, res) => {
  const me = (req.user as any)?.id
  if (!me) { res.status(401).json({ error: 'unauthorized' }); return }
  try {
    const count = await prisma.directMessage.count({ where: { toId: me, read: false } })
    res.json({ count })
  } catch { res.status(500).json({ error: 'サーバーエラー' }) }
})

export default router
