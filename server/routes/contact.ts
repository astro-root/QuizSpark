import { Router } from 'express'
import { prisma } from '../lib/prisma'

const router = Router()

const CATEGORIES = ['バグ報告', '要望', 'ハラスメント', 'その他']

router.post('/', async (req, res) => {
  if (!req.user) { res.status(401).json({ error: 'ログインが必要です' }); return }
  const { category, body } = req.body ?? {}
  if (!CATEGORIES.includes(category))
    { res.status(400).json({ error: '無効なカテゴリです' }); return }
  if (!body?.trim() || body.trim().length > 1000)
    { res.status(400).json({ error: '本文は1〜1000文字で入力してください' }); return }
  try {
    const u = req.user as any
    await prisma.contact.create({
      data: { userId: u.id, email: u.email ?? '', category, body: body.trim() }
    })
    res.json({ ok: true })
  } catch { res.status(500).json({ error: 'サーバーエラー' }) }
})

router.get('/', async (req, res) => {
  if (!(req.user as any)?.isAdmin) { res.status(403).json({ error: '権限がありません' }); return }
  try {
    res.json(await prisma.contact.findMany({ orderBy: { createdAt: 'desc' } }))
  } catch { res.status(500).json({ error: 'サーバーエラー' }) }
})

export default router
