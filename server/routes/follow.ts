import { Router } from 'express'
import { prisma } from '../lib/prisma'

const router = Router()

router.get('/user/:id', async (req, res) => {
  const { id } = req.params
  const myId = (req.user as any)?.id ?? null
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, username: true, avatarUrl: true, bio: true, rate: true,
        _count: { select: { followers: true, following: true, battleRecords: true } },
        battleRecords: { select: { result: true }, take: 100 }
      }
    })
    if (!user) { res.status(404).json({ error: 'not found' }); return }
    const isFollowing = myId
      ? !!(await prisma.follow.findUnique({ where: { followerId_followingId: { followerId: myId, followingId: id } } }))
      : false
    const wins = user.battleRecords.filter(r => r.result === 'WIN').length
    const total = user._count.battleRecords
    res.json({ ...user, isFollowing, wins, winRate: total ? Math.round(wins / total * 100) : 0 })
  } catch { res.status(500).json({ error: 'サーバーエラー' }) }
})

router.post('/:id', async (req, res) => {
  const myId = (req.user as any)?.id
  if (!myId) { res.status(401).json({ error: '未ログイン' }); return }
  const { id } = req.params
  if (myId === id) { res.status(400).json({ error: '自分はフォローできません' }); return }
  try {
    const target = await prisma.user.findUnique({ where: { id }, select: { id: true } })
    if (!target) { res.status(404).json({ error: 'ユーザーが見つかりません' }); return }
    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId: myId, followingId: id } },
      create: { followerId: myId, followingId: id },
      update: {}
    })
    await prisma.notification.create({
      data: { userId: id, type: 'follow', fromId: myId }
    }).catch(() => {})
    res.json({ ok: true })
  } catch { res.status(500).json({ error: 'サーバーエラー' }) }
})

router.delete('/:id', async (req, res) => {
  const myId = (req.user as any)?.id
  if (!myId) { res.status(401).json({ error: '未ログイン' }); return }
  try {
    await prisma.follow.deleteMany({ where: { followerId: myId, followingId: req.params.id } })
    res.json({ ok: true })
  } catch { res.status(500).json({ error: 'サーバーエラー' }) }
})

router.get('/:id/followers', async (req, res) => {
  try {
    const list = await prisma.follow.findMany({
      where: { followingId: req.params.id },
      include: { follower: { select: { id: true, name: true, username: true, avatarUrl: true, rate: true } } },
      orderBy: { createdAt: 'desc' }
    })
    res.json(list.map(f => f.follower))
  } catch { res.status(500).json({ error: 'サーバーエラー' }) }
})

router.get('/:id/following', async (req, res) => {
  try {
    const list = await prisma.follow.findMany({
      where: { followerId: req.params.id },
      include: { following: { select: { id: true, name: true, username: true, avatarUrl: true, rate: true } } },
      orderBy: { createdAt: 'desc' }
    })
    res.json(list.map(f => f.following))
  } catch { res.status(500).json({ error: 'サーバーエラー' }) }
})

export default router
