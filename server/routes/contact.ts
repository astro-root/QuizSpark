import { Router } from 'express'
import { prisma } from '../lib/prisma'

const router = Router()

router.post('/', async (req, res) => {
  const { category, body } = req.body
  if (!category || !body?.trim()) {
    res.status(400).json({ error: '必須項目が不足しています' }); return
  }
  const u = req.user as any
  const email = u?.email ?? ''
  await prisma.contact.create({
    data: {
      userId: u?.id ?? null,
      email,
      category,
      body: body.trim(),
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
