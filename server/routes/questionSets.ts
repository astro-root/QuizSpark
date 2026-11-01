import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { parseAnswers, validateQuestionInput } from '../lib/validation'

const router = Router()

function requireAuth(req: any, res: any, next: any) {
  if (!req.user) { res.status(401).json({ error: '未ログイン' }); return }
  next()
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const sets = await prisma.questionSet.findMany({
      where: { userId: (req.user as any).id },
      include: { _count: { select: { items: true } } },
      orderBy: { updatedAt: 'desc' },
    })
    res.json(sets)
  } catch { res.status(500).json({ error: 'サーバーエラー' }) }
})

router.get('/public', async (_req, res) => {
  try {
    const sets = await prisma.questionSet.findMany({
      where: { isPublic: true },
      include: { _count: { select: { items: true } }, user: { select: { name: true, username: true } } },
      orderBy: { updatedAt: 'desc' },
    })
    res.json(sets)
  } catch { res.status(500).json({ error: 'サーバーエラー' }) }
})

router.post('/', requireAuth, async (req, res) => {
  const { name, description, isPublic } = req.body ?? {}
  if (!name?.trim() || name.trim().length > 50)
    { res.status(400).json({ error: '名前は1〜50文字で入力してください' }); return }
  if (description && description.length > 200)
    { res.status(400).json({ error: '説明は200文字以内です' }); return }
  try {
    const set = await prisma.questionSet.create({
      data: { userId: (req.user as any).id, name: name.trim(), description: description ?? '', isPublic: !!isPublic },
    })
    res.status(201).json(set)
  } catch { res.status(500).json({ error: 'サーバーエラー' }) }
})

router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const set = await prisma.questionSet.findUnique({ where: { id: req.params.id } })
    if (!set || set.userId !== (req.user as any).id) { res.status(403).json({ error: '権限がありません' }); return }
    const { name, description, isPublic } = req.body ?? {}
    if (name !== undefined && (!name?.trim() || name.trim().length > 50))
      { res.status(400).json({ error: '名前は1〜50文字です' }); return }
    res.json(await prisma.questionSet.update({ where: { id: req.params.id }, data: { name: name?.trim(), description, isPublic } }))
  } catch { res.status(500).json({ error: 'サーバーエラー' }) }
})

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const set = await prisma.questionSet.findUnique({ where: { id: req.params.id } })
    if (!set || set.userId !== (req.user as any).id) { res.status(403).json({ error: '権限がありません' }); return }
    await prisma.questionSet.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch { res.status(500).json({ error: 'サーバーエラー' }) }
})

router.get('/:id/items', requireAuth, async (req, res) => {
  try {
    const set = await prisma.questionSet.findUnique({ where: { id: req.params.id } })
    if (!set || set.userId !== (req.user as any).id) { res.status(403).json({ error: '権限がありません' }); return }
    res.json(await prisma.questionSetItem.findMany({ where: { setId: req.params.id }, orderBy: { order: 'asc' } }))
  } catch { res.status(500).json({ error: 'サーバーエラー' }) }
})

router.post('/:id/items', requireAuth, async (req, res) => {
  try {
    const set = await prisma.questionSet.findUnique({ where: { id: req.params.id } })
    if (!set || set.userId !== (req.user as any).id) { res.status(403).json({ error: '権限がありません' }); return }
    const { displayAnswer, order, genre } = req.body ?? {}
    if (typeof displayAnswer !== 'string' || !displayAnswer.trim())
      { res.status(400).json({ error: '必須項目不足' }); return }
    const v = validateQuestionInput(req.body)
    if (!v.ok) { res.status(400).json({ error: v.error }); return }
    const item = await prisma.questionSetItem.create({
      data: {
        setId: req.params.id, text: v.value.text, answer: v.value.answer, answers: v.value.answers,
        displayAnswer: v.value.displayAnswer,
        genre: typeof genre === 'string' && genre.trim() ? genre.trim().slice(0, 50) : 'ノンジャンル',
        order: Number.isInteger(order) ? order : 0,
      }
    })
    await prisma.questionSet.update({ where: { id: req.params.id }, data: { updatedAt: new Date() } })
    res.status(201).json(item)
  } catch { res.status(500).json({ error: 'サーバーエラー' }) }
})

router.post('/:id/import', requireAuth, async (req, res) => {
  try {
    const set = await prisma.questionSet.findUnique({ where: { id: req.params.id } })
    if (!set || set.userId !== (req.user as any).id) { res.status(403).json({ error: '権限がありません' }); return }
    const { rows } = req.body
    if (!Array.isArray(rows) || rows.length === 0) { res.status(400).json({ error: 'データが空です' }); return }
    if (rows.length > 500) { res.status(400).json({ error: '一度にインポートできるのは500件までです' }); return }
    const existing = await prisma.questionSetItem.count({ where: { setId: req.params.id } })
    const data = rows.map((r: any, i: number) => ({
      setId: req.params.id,
      text: String(r.text ?? '').trim().slice(0, 500),
      answer: String(r.answer ?? '').trim().slice(0, 100),
      answers: (() => { const a = String(r.answer ?? '').trim().slice(0, 100); const p = parseAnswers(r.answers, a); return p.ok ? p.value : [a] })(),
      displayAnswer: String(r.displayAnswer ?? r.answer ?? '').trim().slice(0, 100),
      genre: String(r.genre ?? 'ノンジャンル').trim().slice(0, 50) || 'ノンジャンル',
      order: existing + i,
    })).filter(r => r.text && r.answer)
    await prisma.questionSetItem.createMany({ data })
    await prisma.questionSet.update({ where: { id: req.params.id }, data: { updatedAt: new Date() } })
    res.json({ imported: data.length })
  } catch { res.status(500).json({ error: 'サーバーエラー' }) }
})

router.delete('/:id/items/:itemId', requireAuth, async (req, res) => {
  try {
    const set = await prisma.questionSet.findUnique({ where: { id: req.params.id } })
    if (!set || set.userId !== (req.user as any).id) { res.status(403).json({ error: '権限がありません' }); return }
    const itemId = parseInt(req.params.itemId)
    if (!Number.isInteger(itemId)) { res.status(400).end(); return }
    // 所有確認済みのセットに属する項目だけを削除する(他人のセットの項目 ID を指定した削除を防ぐ)
    const { count } = await prisma.questionSetItem.deleteMany({ where: { id: itemId, setId: req.params.id } })
    if (count === 0) { res.status(404).json({ error: '見つかりません' }); return }
    res.json({ ok: true })
  } catch { res.status(500).json({ error: 'サーバーエラー' }) }
})

export default router
