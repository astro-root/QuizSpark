import { Router } from 'express'
import { prisma } from '../lib/prisma'

const router = Router()

function requireAuth(req: any, res: any, next: any) {
  if (!req.user) { res.status(401).json({ error: '未ログイン' }); return }
  next()
}

// 自分のセット一覧
router.get('/', requireAuth, async (req, res) => {
  const sets = await prisma.questionSet.findMany({
    where: { userId: (req.user as any).id },
    include: { _count: { select: { items: true } } },
    orderBy: { updatedAt: 'desc' },
  })
  res.json(sets)
})

// 公開セット一覧
router.get('/public', async (_req, res) => {
  const sets = await prisma.questionSet.findMany({
    where: { isPublic: true },
    include: { _count: { select: { items: true } }, user: { select: { name: true, username: true } } },
    orderBy: { updatedAt: 'desc' },
  })
  res.json(sets)
})

// セット作成
router.post('/', requireAuth, async (req, res) => {
  const { name, description, isPublic } = req.body
  if (!name?.trim()) { res.status(400).json({ error: '名前は必須です' }); return }
  const set = await prisma.questionSet.create({
    data: { userId: (req.user as any).id, name: name.trim(), description, isPublic: !!isPublic },
  })
  res.status(201).json(set)
})

// セット更新
router.patch('/:id', requireAuth, async (req, res) => {
  const set = await prisma.questionSet.findUnique({ where: { id: req.params.id } })
  if (!set || set.userId !== (req.user as any).id) { res.status(403).json({ error: '権限がありません' }); return }
  const { name, description, isPublic } = req.body
  res.json(await prisma.questionSet.update({ where: { id: req.params.id }, data: { name, description, isPublic } }))
})

// セット削除
router.delete('/:id', requireAuth, async (req, res) => {
  const set = await prisma.questionSet.findUnique({ where: { id: req.params.id } })
  if (!set || set.userId !== (req.user as any).id) { res.status(403).json({ error: '権限がありません' }); return }
  await prisma.questionSet.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

// アイテム一覧
router.get('/:id/items', requireAuth, async (req, res) => {
  const set = await prisma.questionSet.findUnique({ where: { id: req.params.id } })
  if (!set || set.userId !== (req.user as any).id) { res.status(403).json({ error: '権限がありません' }); return }
  res.json(await prisma.questionSetItem.findMany({ where: { setId: req.params.id }, orderBy: { order: 'asc' } }))
})

// アイテム追加
router.post('/:id/items', requireAuth, async (req, res) => {
  const set = await prisma.questionSet.findUnique({ where: { id: req.params.id } })
  if (!set || set.userId !== (req.user as any).id) { res.status(403).json({ error: '権限がありません' }); return }
  const { text, answer, answers, displayAnswer, order } = req.body
  if (!text || !answer || !displayAnswer) { res.status(400).json({ error: '必須項目不足' }); return }
  const item = await prisma.questionSetItem.create({
    data: { setId: req.params.id, text, answer, answers: answers ?? [answer], displayAnswer, order: order ?? 0 }
  })
  await prisma.questionSet.update({ where: { id: req.params.id }, data: { updatedAt: new Date() } })
  res.status(201).json(item)
})

// CSVバルクインポート
router.post('/:id/import', requireAuth, async (req, res) => {
  const set = await prisma.questionSet.findUnique({ where: { id: req.params.id } })
  if (!set || set.userId !== (req.user as any).id) { res.status(403).json({ error: '権限がありません' }); return }
  const { rows } = req.body // [{ text, answer, answers?, displayAnswer }]
  if (!Array.isArray(rows) || rows.length === 0) { res.status(400).json({ error: 'データが空です' }); return }

  const existing = await prisma.questionSetItem.count({ where: { setId: req.params.id } })
  const data = rows.map((r: any, i: number) => ({
    setId: req.params.id,
    text: String(r.text ?? '').trim(),
    answer: String(r.answer ?? '').trim(),
    answers: Array.isArray(r.answers) ? r.answers : [String(r.answer ?? '').trim()],
    displayAnswer: String(r.displayAnswer ?? r.answer ?? '').trim(),
    order: existing + i,
  })).filter(r => r.text && r.answer)

  await prisma.questionSetItem.createMany({ data })
  await prisma.questionSet.update({ where: { id: req.params.id }, data: { updatedAt: new Date() } })
  res.json({ imported: data.length })
})

// アイテム削除
router.delete('/:id/items/:itemId', requireAuth, async (req, res) => {
  const set = await prisma.questionSet.findUnique({ where: { id: req.params.id } })
  if (!set || set.userId !== (req.user as any).id) { res.status(403).json({ error: '権限がありません' }); return }
  await prisma.questionSetItem.delete({ where: { id: parseInt(req.params.itemId) } })
  res.json({ ok: true })
})

export default router
