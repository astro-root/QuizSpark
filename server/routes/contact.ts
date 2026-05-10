import { Router } from 'express'
import { prisma } from '../lib/prisma'

const router = Router()

router.post('/', async (req, res) => {
  const { email, category, body } = req.body
  if (!email || !category || !body?.trim()) {
    res.status(400).json({ error: '必須項目が不足しています' }); return
  }
  await prisma.contact.create({
    data: {
      userId: (req.user as any)?.id ?? null,
      email, category, body: body.trim(),
    }
  })
  res.json({ ok: true })
})

// 管理者用一覧
router.get('/', async (req, res) => {
  if (!(req.user as any)?.isAdmin) { res.status(403).json({ error: '権限がありません' }); return }
  res.json(await prisma.contact.findMany({ orderBy: { createdAt: 'desc' } }))
})

export default router
