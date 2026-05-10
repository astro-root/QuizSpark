import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'

const router = Router()

// 新規登録
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body
  if (!name || !email || !password) { res.status(400).json({ error: '全項目必須です' }); return }
  if (password.length < 8) { res.status(400).json({ error: 'パスワードは8文字以上' }); return }

  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) { res.status(400).json({ error: 'このメールアドレスは登録済みです' }); return }

  const hash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { name, email, passwordAuth: { create: { passwordHash: hash } } }
  })

  req.login(user, err => {
    if (err) { res.status(500).json({ error: '登録後のログインに失敗しました' }); return }
    res.json({ id: user.id, name: user.name, avatarUrl: user.avatarUrl })
  })
})

// ログイン
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) { res.status(400).json({ error: '全項目必須です' }); return }

  const user = await prisma.user.findUnique({ where: { email }, include: { passwordAuth: true } })
  if (!user?.passwordAuth) { res.status(401).json({ error: 'メールアドレスまたはパスワードが違います' }); return }

  const ok = await bcrypt.compare(password, user.passwordAuth.passwordHash)
  if (!ok) { res.status(401).json({ error: 'メールアドレスまたはパスワードが違います' }); return }

  req.login(user, err => {
    if (err) { res.status(500).json({ error: 'ログインに失敗しました' }); return }
    res.json({ id: user.id, name: user.name, avatarUrl: user.avatarUrl })
  })
})

export default router
