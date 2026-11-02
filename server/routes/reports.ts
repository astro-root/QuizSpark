import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { validateReportInput } from '../lib/validation'
const router = Router()

router.post('/', async (req, res) => {
  const user = (req as any).user
  if (!user) return res.status(401).json({ error: 'unauthorized' })
  const v = validateReportInput(req.body)
  if (!v.ok) return res.status(400).json({ error: 'invalid' })
  const { questionId, reason } = v.value
  try {
    const target = await prisma.question.findUnique({ where: { id: questionId }, select: { id: true } })
    if (!target) return res.status(404).json({ error: 'not_found' })
    const existing = await prisma.questionReport.findFirst({
      where: { userId: user.id, questionId, resolved: false }
    })
    if (existing) return res.status(409).json({ error: 'already_reported' })
    const report = await prisma.questionReport.create({ data: { userId: user.id, questionId, reason } })
    res.json(report)
  } catch { res.status(500).json({ error: 'サーバーエラー' }) }
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
