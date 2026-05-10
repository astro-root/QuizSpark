import { Router } from 'express'
import passport from './passport'

const router = Router()

router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
)

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/?auth=failed' }),
  (_req, res) => res.redirect('/')
)

router.get('/me', (req, res) => {
  if (req.user) res.json(req.user)
  else res.status(401).json(null)
})

router.post('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err)
    res.json({ ok: true })
  })
})

export default router
