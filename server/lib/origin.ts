import type { NextFunction, Request, Response } from 'express'

export const DEFAULT_ALLOWED_ORIGINS = ['https://quiz.astro-root.com', 'http://localhost:5173']

/** ALLOWED_ORIGINS(カンマ区切り)と FRONTEND_URL から許可オリジン一覧を作る。未設定なら従来の固定値。 */
export function parseAllowedOrigins(allowedEnv?: string, frontendUrl?: string): string[] {
  const norm = (s: string) => s.trim().replace(/\/+$/, '')
  const list = (allowedEnv ?? '').split(',').map(norm).filter(Boolean)
  if (frontendUrl && /^https?:\/\//.test(frontendUrl)) {
    try { list.push(new URL(frontendUrl).origin) } catch { /* 不正な URL は無視 */ }
  }
  return list.length > 0 ? [...new Set(list)] : [...DEFAULT_ALLOWED_ORIGINS]
}

export const allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS, process.env.FRONTEND_URL)

/** Origin ヘッダが無い(ブラウザ以外のクライアント)場合は許可。ブラウザは必ず付ける。 */
export function isOriginAllowed(origin: string | undefined, allowed: string[]): boolean {
  if (!origin) return true
  return allowed.includes(origin)
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * Cookie セッション(SameSite=None)に対する CSRF 対策。
 * 状態を変更するリクエストは、許可されたオリジンからのものだけを受け付ける。
 */
export function csrfGuard(allowed: string[] = allowedOrigins) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (SAFE_METHODS.has(req.method)) { next(); return }
    const origin = req.headers.origin
    const site = req.headers['sec-fetch-site']
    const bad = origin ? !isOriginAllowed(origin, allowed) : site === 'cross-site'
    if (bad) { res.status(403).json({ error: '許可されていないリクエスト元です' }); return }
    next()
  }
}
