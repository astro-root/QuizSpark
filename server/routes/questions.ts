import { Router } from 'express'
import { prisma } from '../lib/prisma'

const router = Router()

// 問題一覧取得（承認済みのみ）
router.get('/', async (_req, res) => {
  const questions = await prisma.question.findMany({ where: { approved: true }, orderBy: { createdAt: 'desc' } })
  res.json(questions)
})

// 問題投稿
router.post('/', async (req, res) => {
  const { text, answer, answers, displayAnswer } = req.body
  if (!text || !answer || !displayAnswer) {
    res.status(400).json({ error: '必須項目が不足しています' }); return
  }
  const q = await prisma.question.create({
    data: { text, answer, answers: answers ?? [answer], displayAnswer, approved: false }
  })
  res.status(201).json(q)
})

// 承認（管理用）
router.patch('/:id/approve', async (req, res) => {
  const id = parseInt(req.params.id)
  const q = await prisma.question.update({ where: { id }, data: { approved: true } })
  res.json(q)
})

// 削除（管理用）
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  await prisma.question.delete({ where: { id } })
  res.json({ ok: true })
})

export default router
