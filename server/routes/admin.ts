import { Router } from 'express'
import { prisma } from '../lib/prisma'

const router = Router()

// 管理者チェックミドルウェア
router.use((req, res, next) => {
  if (!(req.user as any)?.isAdmin) { res.status(403).json({ error: '権限がありません' }); return }
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
