import { Router } from 'express'
import { prisma } from '../lib/prisma'

const router = Router()

// 会話一覧（フォロー中ユーザーとのDM）
router.get('/conversations', async (req, res) => {
  const me = (req.user as any)?.id
  if (!me) { res.status(401).json({ error: 'unauthorized' }); return }

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

  convs.sort((a, b) => {
    const at = a.lastMessage?.createdAt?.getTime() ?? 0
    const bt = b.lastMessage?.createdAt?.getTime() ?? 0
    return bt - at
  })

  res.json(convs)
})

// メッセージ一覧
router.get('/messages/:userId', async (req, res) => {
  const me = (req.user as any)?.id
  if (!me) { res.status(401).json({ error: 'unauthorized' }); return }
  const other = req.params.userId

  const messages = await prisma.directMessage.findMany({
    where: { OR: [{ fromId: me, toId: other }, { fromId: other, toId: me }] },
    orderBy: { createdAt: 'asc' },
    take: 100
  })

  // 既読にする
  await prisma.directMessage.updateMany({
    where: { fromId: other, toId: me, read: false },
    data: { read: true }
  })

  res.json(messages)
})

// メッセージ送信
router.post('/messages/:userId', async (req, res) => {
  const me = (req.user as any)?.id
  if (!me) { res.status(401).json({ error: 'unauthorized' }); return }
  const toId = req.params.userId
  const { body } = req.body
  if (!body?.trim()) { res.status(400).json({ error: 'empty' }); return }

  const msg = await prisma.directMessage.create({
    data: { fromId: me, toId, body: body.trim().slice(0, 500) }
  })

  // 通知作成
  await prisma.notification.create({
    data: { userId: toId, type: 'dm', fromId: me, data: body.trim().slice(0, 50) }
  })

  res.json(msg)
})

// 未読数合計
router.get('/unread', async (req, res) => {
  const me = (req.user as any)?.id
  if (!me) { res.status(401).json({ error: 'unauthorized' }); return }
  const count = await prisma.directMessage.count({ where: { toId: me, read: false } })
  res.json({ count })
})

export default router
