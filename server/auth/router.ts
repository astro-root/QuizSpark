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
    res.json({ id: u.id, name: u.name, avatarUrl: u.avatarUrl, isAdmin: u.isAdmin })
  } else res.status(401).json(null)
})

router.patch('/profile', async (req, res) => {
  if (!req.user) { res.status(401).json({ error: '未ログイン' }); return }
  const { name } = req.body
  if (!name?.trim()) { res.status(400).json({ error: '名前は必須です' }); return }
  const user = await prisma.user.update({
    where: { id: (req.user as any).id },
    data: { name: name.trim() },
  })
  res.json({ id: user.id, name: user.name, avatarUrl: user.avatarUrl })
})

router.post('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err)
    res.json({ ok: true })
  })
})

export default router
