import { Router } from 'express'
import passport from './passport'
import { prisma } from '../lib/prisma'
import multer from 'multer'
import path from 'path'
import fs from 'fs'

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(process.cwd(), 'public/avatars')
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const ext = { 'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','image/gif':'.gif' }[file.mimetype] ?? '.jpg'
    cb(null, `${(req.user as any)?.id ?? 'unknown'}_${Date.now()}${ext}`)
  },
})
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, ['image/jpeg','image/png','image/webp','image/gif'].includes(file.mimetype))
  },
})

const router = Router()

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }))

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/?auth=failed' }),
  (_req, res) => res.redirect(process.env.FRONTEND_URL ?? '/')
)

router.get('/me', (req, res) => {
  if (!req.user) { res.status(401).json(null); return }
  const u = req.user as any
  res.json({ id: u.id, name: u.name, avatarUrl: u.avatarUrl, isAdmin: u.isAdmin, bio: u.bio, username: u.username })
})

router.post('/avatar', upload.single('avatar'), async (req, res) => {
  if (!req.user) { res.status(401).json({ error: '未ログイン' }); return }
  if (!req.file) { res.status(400).json({ error: 'ファイルがありません' }); return }
  try {
    const user = await prisma.user.update({
      where: { id: (req.user as any).id },
      data: { avatarUrl: `/avatars/${req.file.filename}` },
    })
    res.json({ id: user.id, name: user.name, avatarUrl: user.avatarUrl, bio: user.bio, username: user.username, isAdmin: user.isAdmin })
  } catch { res.status(500).json({ error: 'サーバーエラー' }) }
})

router.patch('/profile', async (req, res) => {
  if (!req.user) { res.status(401).json({ error: '未ログイン' }); return }
  const { name, bio, username } = req.body ?? {}
  if (!name?.trim() || name.trim().length > 30) { res.status(400).json({ error: '名前は1〜30文字で入力してください' }); return }
  if (bio && bio.length > 200) { res.status(400).json({ error: '自己紹介は200文字以内です' }); return }
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
    res.status(500).json({ error: 'サーバーエラー' })
  }
})

router.delete('/account', async (req, res, next) => {
  if (!req.user) { res.status(401).json({ error: '未ログイン' }); return }
  const id = (req.user as any).id
  req.logout(async err => {
    if (err) return next(err)
    try {
      await prisma.user.delete({ where: { id } })
      res.json({ ok: true })
    } catch { res.status(500).json({ error: 'サーバーエラー' }) }
  })
})

router.post('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err)
    res.json({ ok: true })
  })
})

export default router
