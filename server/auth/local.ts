import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'

const router = Router()

function validateEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
}

router.post('/register', async (req, res) => {
  const { name, email, password, username } = req.body ?? {}
  if (!name?.trim() || name.trim().length > 30)
    { res.status(400).json({ error: '名前は1〜30文字で入力してください' }); return }
  if (!email || !validateEmail(email) || email.length > 200)
    { res.status(400).json({ error: '有効なメールアドレスを入力してください' }); return }
  if (!password || password.length < 8 || password.length > 100)
    { res.status(400).json({ error: 'パスワードは8〜100文字で入力してください' }); return }
  if (!username?.trim() || !/^[a-zA-Z0-9_]{3,20}$/.test(username))
    { res.status(400).json({ error: 'ユーザーIDは3〜20文字の英数字・アンダースコアのみです' }); return }

  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) { res.status(400).json({ error: 'このメールアドレスは既に使用されています' }); return }
  const usernameExists = await prisma.user.findUnique({ where: { username: username.trim() } })
  if (usernameExists) { res.status(400).json({ error: 'このユーザーIDは既に使用されています' }); return }

  const hash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email,
      username: username.trim(),
      passwordAuth: { create: { passwordHash: hash } },
    },
  })
  req.login(user, (err) => {
    if (err) { res.status(500).json({ error: 'ログインに失敗しました' }); return }
    res.json({ id: user.id, name: user.name, avatarUrl: user.avatarUrl, isAdmin: user.isAdmin, bio: user.bio, username: user.username, titleId: (user as any).titleId, rate: (user as any).rate ?? 0 })
  })
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {}
  if (!email || !password)
    { res.status(400).json({ error: 'メールアドレスとパスワードを入力してください' }); return }
  if (email.length > 200 || password.length > 100)
    { res.status(400).json({ error: '入力値が不正です' }); return }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { passwordAuth: true },
  })
  if (!user?.passwordAuth)
    { res.status(401).json({ error: 'メールアドレスまたはパスワードが正しくありません' }); return }

  const ok = await bcrypt.compare(password, user.passwordAuth.passwordHash)
  if (!ok)
    { res.status(401).json({ error: 'メールアドレスまたはパスワードが正しくありません' }); return }

  req.login(user, (err) => {
    if (err) { res.status(500).json({ error: 'ログインに失敗しました' }); return }
    res.json({ id: user.id, name: user.name, avatarUrl: user.avatarUrl, isAdmin: user.isAdmin, bio: user.bio, username: user.username, titleId: (user as any).titleId, rate: (user as any).rate ?? 0 })
  })
})

export default router
