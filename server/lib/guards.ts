import type { NextFunction, Request, Response } from 'express'

type MaybeUser = { id?: string; isAdmin?: boolean } | undefined

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!(req.user as MaybeUser)?.id) { res.status(401).json({ error: 'ログインが必要です' }); return }
  next()
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const u = req.user as MaybeUser
  if (!u?.id) { res.status(401).json({ error: 'ログインが必要です' }); return }
  if (!u.isAdmin) { res.status(403).json({ error: '権限がありません' }); return }
  next()
}
