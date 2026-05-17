import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const router = Router()

router.post('/', async (req, res) => {
  const user = (req as any).user
  if (!user) return res.status(401).json({ error: 'unauthorized' })
  const { questionId, reason } = req.body
  if (!questionId || !reason?.trim()) return res.status(400).json({ error: 'invalid' })
  const existing = await prisma.questionReport.findFirst({
    where: { userId: user.id, questionId: Number(questionId), resolved: false }
  })
  if (existing) return res.status(409).json({ error: 'already_reported' })
  const report = await prisma.questionReport.create({
    data: { userId: user.id, questionId: Number(questionId), reason: reason.trim() }
  })
  res.json(report)
})

// 管理者用: 未解決一覧
router.get('/', async (req, res) => {
  const user = (req as any).user
  if (!(user as any)?.isAdmin) return res.status(403).json({ error: 'forbidden' })
  const reports = await prisma.questionReport.findMany({
    where: { resolved: false },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' }
  })
  res.json(reports)
})

router.patch('/:id/resolve', async (req, res) => {
  const user = (req as any).user
  if (!(user as any)?.isAdmin) return res.status(403).json({ error: 'forbidden' })
  await prisma.questionReport.update({ where: { id: req.params.id }, data: { resolved: true } })
  res.json({ ok: true })
})

export default router
