import { Router } from 'express'
import passport from './passport'
import { prisma } from '../lib/prisma'

const router = Router()

router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
)

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/?auth=failed' }),
  (_req, res) => res.redirect('/')
)

router.get('/me', (req, res) => {
  if (req.user) {
    const u = req.user as any
    res.json({ id: u.id, name: u.name, avatarUrl: u.avatarUrl, isAdmin: u.isAdmin, bio: u.bio, username: u.username })
  } else res.status(401).json(null)
})

router.patch('/profile', async (req, res) => {
  if (!req.user) { res.status(401).json({ error: '未ログイン' }); return }
  const { name, bio, username } = req.body
  if (!name?.trim()) { res.status(400).json({ error: '名前は必須です' }); return }
  if (username && !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    res.status(400).json({ error: 'ユーザーIDは3〜20文字の英数字・アンダースコアのみです' }); return
  }
  try {
    const user = await prisma.user.update({
      where: { id: (req.user as any).id },
      data: { name: name.trim(), bio: bio?.trim() || null, username: username?.trim() || null },
    })
    res.json({ id: user.id, name: user.name, avatarUrl: user.avatarUrl, bio: user.bio, username: user.username, isAdmin: user.isAdmin })
  } catch (e: any) {
    if (e.code === 'P2002') { res.status(400).json({ error: 'そのユーザーIDは既に使われています' }); return }
    throw e
  }
})

router.post('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err)
    res.json({ ok: true })
  })
})

export default router
