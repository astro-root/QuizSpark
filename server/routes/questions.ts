import { Router } from 'express'
import { prisma } from '../lib/prisma'

const router = Router()
const GENRES = ['文学','歴史','地理','公民','自然科学','言葉','芸能','スポーツ','漫アゲ','音楽','生活','ノンジャンル']

router.get('/', async (_req, res) => {
  try {
    const questions = await prisma.question.findMany({ where: { approved: true }, orderBy: { createdAt: 'desc' } })
    res.json(questions)
  } catch { res.status(500).json({ error: 'サーバーエラー' }) }
})

router.get('/export.csv', async (req, res) => {
  if (!(req.user as any)?.isAdmin) { res.status(403).end(); return }
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

router.post('/import', async (req, res) => {
  if (!(req.user as any)?.isAdmin) { res.status(403).end(); return }
  const { rows } = req.body as { rows: { text:string; answer:string; displayAnswer:string; genre?:string; answers?:string[] }[] }
  if (!Array.isArray(rows) || rows.length === 0) { res.status(400).json({ error: '行がありません' }); return }
  let imported = 0
  for (const r of rows) {
    if (!r.text?.trim() || !r.answer?.trim()) continue
    const genre = GENRES.includes(r.genre ?? '') ? r.genre! : 'ノンジャンル'
    const answers = r.answers?.length ? r.answers : [r.answer]
    await prisma.question.create({
      data: { text: r.text.trim(), answer: r.answer.trim(), displayAnswer: r.displayAnswer?.trim() || r.answer.trim(), genre, answers, approved: true }
    })
    imported++
  }
  res.json({ imported })
})

router.post('/', async (req, res) => {
  if (!req.user) { res.status(401).json({ error: 'ログインが必要です' }); return }
  const { text, answer, answers, displayAnswer, genre } = req.body ?? {}
  if (!text?.trim() || text.trim().length > 500)
    { res.status(400).json({ error: '問題文は1〜500文字で入力してください' }); return }
  if (!answer?.trim() || answer.trim().length > 100)
    { res.status(400).json({ error: '答えは1〜100文字で入力してください' }); return }
  try {
    const g = GENRES.includes(genre) ? genre : 'ノンジャンル'
    const q = await prisma.question.create({
      data: { text: text.trim(), answer: answer.trim(), answers: answers ?? [answer.trim()], displayAnswer: displayAnswer?.trim() || answer.trim(), genre: g, authorId: (req.user as any).id }
    })
    res.json(q)
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
