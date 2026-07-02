import { Router } from 'express'
import passport from './passport'
import { prisma } from '../lib/prisma'
import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import { getUnlockedTitles } from '../../src/lib/titles'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, _file) => ({
    folder: 'quizspark/avatars',
    public_id: `${(req.user as any)?.id ?? 'unknown'}_${Date.now()}`,
    allowed_formats: ['jpg', 'png', 'webp', 'gif'],
    transformation: [{ width: 256, height: 256, crop: 'fill', gravity: 'face' }],
  }),
})

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype))
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
  res.json({ id: u.id, name: u.name, avatarUrl: u.avatarUrl, isAdmin: u.isAdmin, bio: u.bio, username: u.username, titleId: u.titleId, rate: u.rate })
})

router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) { res.status(500).json({ error: 'ログアウトに失敗しました' }); return }
    req.session.destroy(() => {
      res.clearCookie('connect.sid')
      res.json({ ok: true })
    })
  })
})

router.post('/avatar', upload.single('avatar'), async (req, res) => {
  if (!req.user) { res.status(401).json({ error: '未ログイン' }); return }
  if (!req.file) { res.status(400).json({ error: 'ファイルがありません' }); return }
  try {
    const url = (req.file as any).path
    const user = await prisma.user.update({
      where: { id: (req.user as any).id },
      data: { avatarUrl: url },
    })
    res.json({ id: user.id, name: user.name, avatarUrl: user.avatarUrl, bio: user.bio, username: user.username, isAdmin: user.isAdmin, titleId: user.titleId, rate: (user as any).rate ?? 0 })
  } catch { res.status(500).json({ error: 'サーバーエラー' }) }
})

router.delete('/avatar', async (req, res) => {
  if (!req.user) { res.status(401).json({ error: '未ログイン' }); return }
  try {
    const user = await prisma.user.update({
      where: { id: (req.user as any).id },
      data: { avatarUrl: null },
    })
    res.json({ id: user.id, name: user.name, avatarUrl: user.avatarUrl, bio: user.bio, username: user.username, isAdmin: user.isAdmin, titleId: user.titleId, rate: (user as any).rate ?? 0 })
  } catch { res.status(500).json({ error: 'サーバーエラー' }) }
})

router.patch('/profile', async (req, res) => {
  if (!req.user) { res.status(401).json({ error: '未ログイン' }); return }
  const { name, bio, username, titleId } = req.body ?? {}
  if (!name?.trim() || name.trim().length > 30) { res.status(400).json({ error: '名前は1〜30文字で入力してください' }); return }
  if (bio && bio.length > 200) { res.status(400).json({ error: '自己紹介は200文字以内です' }); return }
  if (username && !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    res.status(400).json({ error: 'ユーザーIDは3〜20文字の英数字・アンダースコアのみです' }); return
  }

  const uid = (req.user as any).id

  if (titleId) {
    const [records, userRow] = await Promise.all([
      prisma.battleRecord.findMany({ where: { userId: uid }, select: { result: true, correct: true } }),
      prisma.user.findUnique({ where: { id: uid }, select: { rate: true } }),
    ])
    const stats = {
      rate: userRow?.rate ?? 0,
      total: records.length,
      wins: records.filter(r => r.result === 'WIN').length,
      correct: records.reduce((s, r) => s + r.correct, 0),
    }
    const unlocked = getUnlockedTitles(stats).some(t => t.id === titleId)
    if (!unlocked) { res.status(400).json({ error: '未解放の称号です' }); return }
  }

  try {
    const user = await prisma.user.update({
      where: { id: uid },
      data: { name: name.trim(), bio: bio?.trim() || null, username: username?.trim() || null, titleId: titleId ?? undefined },
    })
    res.json({ id: user.id, name: user.name, avatarUrl: user.avatarUrl, bio: user.bio, username: user.username, isAdmin: user.isAdmin, titleId: user.titleId, rate: (user as any).rate ?? 0 })
  } catch (e: any) {
    if (e.code === 'P2002') { res.status(400).json({ error: 'そのユーザーIDは既に使われています' }); return }
    res.status(500).json({ error: 'サーバーエラー' })
  }
})

export default router
