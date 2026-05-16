import { Router } from 'express'
import { prisma } from '../lib/prisma'

const router = Router()

router.use((req, res, next) => {
  if (!(req.user as any)?.isAdmin) { res.status(403).json({ error: '権限がありません' }); return }
  next()
})

router.get('/questions', async (_req, res) => {
  try {
    res.json(await prisma.question.findMany({ where: { approved: false }, orderBy: { createdAt: 'desc' } }))
  } catch { res.status(500).json({ error: 'サーバーエラー' }) }
})

router.get('/questions/all', async (_req, res) => {
  try {
    res.json(await prisma.question.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }))
  } catch { res.status(500).json({ error: 'サーバーエラー' }) }
})

router.patch('/questions/:id/approve', async (req, res) => {
  const id = parseInt(req.params.id)
  if (!Number.isInteger(id)) { res.status(400).end(); return }
  try {
    res.json(await prisma.question.update({ where: { id }, data: { approved: true } }))
  } catch { res.status(404).json({ error: '問題が見つかりません' }) }
})

router.patch('/questions/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  if (!Number.isInteger(id)) { res.status(400).end(); return }
  const { text, answer, answers, displayAnswer } = req.body ?? {}
  if (!text?.trim() || !answer?.trim()) { res.status(400).json({ error: '必須項目不足' }); return }
  try {
    res.json(await prisma.question.update({ where: { id }, data: { text: text.trim(), answer: answer.trim(), answers, displayAnswer } }))
  } catch { res.status(404).json({ error: '問題が見つかりません' }) }
})

router.delete('/questions/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  if (!Number.isInteger(id)) { res.status(400).end(); return }
  try {
    await prisma.question.delete({ where: { id } })
    res.json({ ok: true })
  } catch { res.status(404).json({ error: '問題が見つかりません' }) }
})

router.get('/announcements', async (_req, res) => {
  try {
    res.json(await prisma.announcement.findMany({ orderBy: { createdAt: 'desc' } }))
  } catch { res.status(500).json({ error: 'サーバーエラー' }) }
})

router.post('/announcements', async (req, res) => {
  const { title, body } = req.body ?? {}
  if (!title?.trim() || !body?.trim()) { res.status(400).json({ error: '必須項目不足' }); return }
  if (title.length > 100 || body.length > 1000) { res.status(400).json({ error: '入力が長すぎます' }); return }
  try {
    res.status(201).json(await prisma.announcement.create({ data: { title: title.trim(), body: body.trim() } }))
  } catch { res.status(500).json({ error: 'サーバーエラー' }) }
})

router.patch('/announcements/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  if (!Number.isInteger(id)) { res.status(400).end(); return }
  try {
    res.json(await prisma.announcement.update({ where: { id }, data: { active: req.body.active } }))
  } catch { res.status(404).json({ error: 'お知らせが見つかりません' }) }
})

router.delete('/announcements/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  if (!Number.isInteger(id)) { res.status(400).end(); return }
  try {
    await prisma.announcement.delete({ where: { id } })
    res.json({ ok: true })
  } catch { res.status(404).json({ error: 'お知らせが見つかりません' }) }
})

router.get('/users', async (_req, res) => {
  try {
    res.json(await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, username: true, email: true, avatarUrl: true, isAdmin: true, createdAt: true, _count: { select: { battleRecords: true, questionSets: true } } }
    }))
  } catch { res.status(500).json({ error: 'サーバーエラー' }) }
})

router.get('/users/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, name: true, username: true, email: true, avatarUrl: true, isAdmin: true, bio: true, createdAt: true,
        battleRecords: { orderBy: { playedAt: 'desc' }, take: 20 },
        questionSets: { select: { id: true, name: true, isPublic: true, _count: { select: { items: true } } } },
        _count: { select: { battleRecords: true, questionSets: true } }
      }
    })
    if (!user) { res.status(404).json({ error: 'Not found' }); return }
    res.json(user)
  } catch { res.status(500).json({ error: 'サーバーエラー' }) }
})

router.patch('/users/:id/admin', async (req, res) => {
  try {
    res.json(await prisma.user.update({
      where: { id: req.params.id },
      data: { isAdmin: !!req.body.isAdmin },
      select: { id: true, name: true, isAdmin: true }
    }))
  } catch { res.status(404).json({ error: 'ユーザーが見つかりません' }) }
})


router.patch('/users/:id/rate', async (req, res) => {
  try {
    const rate = parseInt(req.body.rate)
    if (isNaN(rate) || rate < 0) { res.status(400).json({ error: '無効な値' }); return }
    res.json(await prisma.user.update({
      where: { id: req.params.id },
      data: { rate },
      select: { id: true, name: true, rate: true }
    }))
  } catch { res.status(404).json({ error: 'ユーザーが見つかりません' }) }
})

router.patch('/users/:id/title', async (req, res) => {
  try {
    const titleId = req.body.titleId ?? null
    res.json(await prisma.user.update({
      where: { id: req.params.id },
      data: { titleId },
      select: { id: true, name: true, titleId: true }
    }))
  } catch { res.status(404).json({ error: 'ユーザーが見つかりません' }) }
})

router.post('/notifications', async (req, res) => {
  try {
    const { userIds, title, body, type } = req.body
    if (!title?.trim() || !body?.trim()) { res.status(400).json({ error: '必須項目不足' }); return }
    const targetIds: string[] = userIds === 'all'
      ? (await prisma.user.findMany({ select: { id: true } })).map((u: {id:string}) => u.id)
      : Array.isArray(userIds) ? userIds : []
    if (targetIds.length === 0) { res.status(400).json({ error: '送信先がいません' }); return }
    await prisma.notification.createMany({
      data: targetIds.map((userId: string) => ({
        userId,
        type: type || 'admin',
        data: JSON.stringify({ title: title.trim(), body: body.trim() }),
        read: false,
      }))
    })
    res.json({ sent: targetIds.length })
  } catch (e) { res.status(500).json({ error: 'サーバーエラー' }) }
})
router.get('/contacts', async (_req, res) => {
  try {
    res.json(await prisma.contact.findMany({ orderBy: { createdAt: 'desc' } }))
  } catch { res.status(500).json({ error: 'サーバーエラー' }) }
})

router.patch('/contacts/:id', async (req, res) => {
  try {
    res.json(await prisma.contact.update({ where: { id: req.params.id }, data: { status: req.body.status } }))
  } catch { res.status(404).json({ error: 'お問い合わせが見つかりません' }) }
})

export default router
