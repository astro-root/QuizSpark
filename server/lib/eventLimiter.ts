export interface LimitRule { max: number; windowMs: number }

/** イベント名ごとの固定窓レート制限(接続ごとに 1 インスタンス作る)。 */
export function createEventLimiter(rules: Record<string, LimitRule>, now: () => number = Date.now) {
  const windows = new Map<string, { count: number; resetAt: number }>()
  return {
    allow(event: string): boolean {
      const rule = rules[event]
      if (!rule) return true
      const t = now()
      const w = windows.get(event)
      if (!w || t >= w.resetAt) { windows.set(event, { count: 1, resetAt: t + rule.windowMs }); return true }
      if (w.count >= rule.max) return false
      w.count++
      return true
    },
  }
}

export const SOCKET_LIMITS: Record<string, LimitRule> = {
  'create-room':     { max: 5,  windowMs: 60_000 },
  'join-room':       { max: 10, windowMs: 60_000 },
  'update-settings': { max: 20, windowMs: 10_000 },
  'start-game':      { max: 5,  windowMs: 10_000 },
  'buzz':            { max: 10, windowMs: 5_000 },
  'submit-answer':   { max: 5,  windowMs: 10_000 },
  'reset-game':      { max: 5,  windowMs: 10_000 },
  'join-queue':      { max: 5,  windowMs: 10_000 },
  'leave-queue':     { max: 10, windowMs: 10_000 },
  'sync-state':      { max: 10, windowMs: 10_000 },
  'send-stamp':      { max: 5,  windowMs: 10_000 },
  'send-chat':       { max: 5,  windowMs: 10_000 },
}
