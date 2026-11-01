import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { requireAdmin, requireAuth } from '../lib/guards'
import { buildSubmittedQuestionData, validateQuestionInput } from '../lib/validation'

const router = Router()

// 正解を含む全問題を返すため管理者限定(以前は未認証で取得できた)
router.get('/', requireAdmin, async (_req, res) => {
  try {
    const questions = await prisma.question.findMany({ where: { approved: true }, orderBy: { createdAt: 'desc' } })
    res.json(questions)
  } catch { res.status(500).json({ error: 'サーバーエラー' }) }
})

router.get('/export.csv', requireAdmin, async (_req, res) => {
  const questions = await prisma.question.findMany({ orderBy: { id: 'asc' } })
  const header = 'id,問題文,答え,表示用答え,ジャンル,別解,承認済み'
  const rows = questions.map(q => {
    const alts = q.answers.filter(a => a !== q.answer).join('|')
    return [q.id, `"${q.text.replace(/"/g,'""')}"`, q.answer, q.displayAnswer, q.genre, alts, q.approved].join(',')
  })
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="questions.csv"')
  res.send('\uFEFF' + [header, ...rows].join('\n'))
})

router.post('/import', requireAdmin, async (req, res) => {
  const rows = (req.body as { rows?: unknown } | undefined)?.rows
  if (!Array.isArray(rows) || rows.length === 0) { res.status(400).json({ error: '行がありません' }); return }
  if (rows.length > 1000) { res.status(400).json({ error: '一度にインポートできるのは1000件までです' }); return }
  const data = rows.flatMap(r => {
    const v = validateQuestionInput(r)
    return v.ok ? [{ ...v.value, approved: true }] : []
  })
  try {
    if (data.length > 0) await prisma.question.createMany({ data })
    res.json({ imported: data.length, skipped: rows.length - data.length })
  } catch { res.status(500).json({ error: 'サーバーエラー' }) }
})

router.post('/', requireAuth, async (req, res) => {
  const v = validateQuestionInput(req.body)
  if (!v.ok) { res.status(400).json({ error: v.error }); return }
  try {
    // 承認制: 投稿は常に未承認で保存し、管理者の承認後に出題プールへ入る
    const q = await prisma.question.create({
      data: buildSubmittedQuestionData(v.value, (req.user as { id: string }).id),
    })
    res.status(201).json({ id: q.id, approved: q.approved })
  } catch { res.status(500).json({ error: 'サーバーエラー' }) }
})

router.patch('/:id/approve', async (req, res) => {
  if (!(req.user as any)?.isAdmin) { res.status(403).end(); return }
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) { res.status(400).end(); return }
  try {
    const q = await prisma.question.update({ where: { id }, data: { approved: true } })
    res.json(q)
  } catch { res.status(404).json({ error: '問題が見つかりません' }) }
})

router.delete('/:id', async (req, res) => {
  if (!(req.user as any)?.isAdmin) { res.status(403).end(); return }
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) { res.status(400).end(); return }
  try {
    await prisma.question.delete({ where: { id } })
    res.json({ ok: true })
  } catch { res.status(404).json({ error: '問題が見つかりません' }) }
})

export default router
