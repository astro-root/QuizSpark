import { Router } from 'express'
import { prisma } from '../lib/prisma'

const router = Router()

// 管理者チェックミドルウェア
router.use((req, res, next) => {
  next()
})

// 未承認問題一覧
router.get('/questions', async (_req, res) => {
  const questions = await prisma.question.findMany({ where: { approved: false }, orderBy: { createdAt: 'desc' } })
  res.json(questions)
})

// 承認
router.patch('/questions/:id/approve', async (req, res) => {
  const q = await prisma.question.update({ where: { id: parseInt(req.params.id) }, data: { approved: true } })
  res.json(q)
})

// 承認済み含む全問題一覧
router.get('/questions/all', async (_req, res) => {
  res.json(await prisma.question.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }))
})

// 問題編集
router.patch('/questions/:id', async (req, res) => {
  const { text, answer, answers, displayAnswer } = req.body
  const q = await prisma.question.update({
    where: { id: parseInt(req.params.id) },
    data: { text, answer, answers, displayAnswer }
  })
  res.json(q)
})

// 削除
router.delete('/questions/:id', async (req, res) => {
  await prisma.question.delete({ where: { id: parseInt(req.params.id) } })
  res.json({ ok: true })
})

// お知らせ一覧
router.get('/announcements', async (_req, res) => {
  res.json(await prisma.announcement.findMany({ orderBy: { createdAt: 'desc' } }))
})

// お知らせ作成
router.post('/announcements', async (req, res) => {
  const { title, body } = req.body
  if (!title || !body) { res.status(400).json({ error: '必須項目不足' }); return }
  res.status(201).json(await prisma.announcement.create({ data: { title, body } }))
})

// お知らせ有効/無効切り替え
router.patch('/announcements/:id', async (req, res) => {
  const { active } = req.body
  res.json(await prisma.announcement.update({ where: { id: parseInt(req.params.id) }, data: { active } }))
})

// お知らせ削除
router.delete('/announcements/:id', async (req, res) => {
  await prisma.announcement.delete({ where: { id: parseInt(req.params.id) } })
  res.json({ ok: true })
})

export default router

// ユーザー一覧
router.get('/users', async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, username: true, email: true,
      avatarUrl: true, isAdmin: true, createdAt: true,
      _count: { select: { battleRecords: true, questionSets: true } }
    }
  })
  res.json(users)
})

// ユーザー詳細（戦績込み）
router.get('/users/:id', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true, name: true, username: true, email: true,
      avatarUrl: true, isAdmin: true, bio: true, createdAt: true,
      battleRecords: { orderBy: { playedAt: 'desc' }, take: 20 },
      questionSets: { select: { id: true, name: true, isPublic: true, _count: { select: { items: true } } } },
      _count: { select: { battleRecords: true, questionSets: true } }
    }
  })
  if (!user) { res.status(404).json({ error: 'Not found' }); return }
  res.json(user)
})

// 管理者権限の付与/剥奪
router.patch('/users/:id/admin', async (req, res) => {
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { isAdmin: req.body.isAdmin },
    select: { id: true, name: true, isAdmin: true }
  })
  res.json(user)
})

// お問い合わせ一覧
router.get('/contacts', async (_req, res) => {
  res.json(await prisma.contact.findMany({ orderBy: { createdAt: 'desc' } }))
})

// お問い合わせステータス更新
router.patch('/contacts/:id', async (req, res) => {
  res.json(await prisma.contact.update({
    where: { id: req.params.id },
    data: { status: req.body.status }
  }))
})
