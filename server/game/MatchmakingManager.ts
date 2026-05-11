import { gameManager } from './GameManager'
import { prisma } from '../lib/prisma'

interface QueueEntry {
  playerId: string
  playerName: string
  rate: number
  joinedAt: number
}

const queue: QueueEntry[] = []
type OnMatchFn = (roomId: string, playerIds: string[]) => void
let onMatchCallback: OnMatchFn | null = null

export function setOnMatch(fn: OnMatchFn) {
  onMatchCallback = fn
}

// レート差の許容範囲（待機時間に応じて拡大）
function rateRange(waitMs: number): number {
  if (waitMs < 15000) return 200
  if (waitMs < 30000) return 400
  return Infinity
}

export async function joinQueue(playerId: string, playerName: string, dbUserId?: string) {
  // 既存エントリ削除
  const idx = queue.findIndex(e => e.playerId === playerId)
  if (idx >= 0) queue.splice(idx, 1)

  // レート取得（DBユーザーがいれば）
  let rate = 1000
  if (dbUserId) {
    const u = await prisma.user.findUnique({ where: { id: dbUserId }, select: { rate: true } })
    if (u) rate = u.rate
  }

  const entry: QueueEntry = { playerId, playerName, rate, joinedAt: Date.now() }
  queue.push(entry)

  tryMatch()
}

function tryMatch() {
  if (queue.length < 2) return

  const now = Date.now()

  // 各エントリについて最も近いレートの相手を探す
  let bestI = -1, bestJ = -1, bestDiff = Infinity

  for (let i = 0; i < queue.length; i++) {
    for (let j = i + 1; j < queue.length; j++) {
      const a = queue[i], b = queue[j]
      const diff = Math.abs(a.rate - b.rate)
      const waitA = now - a.joinedAt
      const waitB = now - b.joinedAt
      const allowedRange = Math.min(rateRange(waitA), rateRange(waitB))
      if (diff <= allowedRange && diff < bestDiff) {
        bestDiff = diff
        bestI = i
        bestJ = j
      }
    }
  }

  if (bestI < 0) return // マッチなし

  // インデックスが大きい方から削除しないとズレる
  const [a, b] = [queue[bestI], queue[bestJ]]
  queue.splice(bestJ, 1)
  queue.splice(bestI, 1)

  createMatch(a, b)
}

// 定期的に待機中プレイヤーを再チェック（範囲が拡大した可能性があるため）
setInterval(() => { if (queue.length >= 2) tryMatch() }, 5000)

export function leaveQueue(playerId: string) {
  const idx = queue.findIndex(e => e.playerId === playerId)
  if (idx >= 0) queue.splice(idx, 1)
}

export function getQueueSize(): number {
  return queue.length
}

function createMatch(
  host: QueueEntry,
  guest: QueueEntry
) {
  const roomId = gameManager.createRoom(host.playerId, host.playerName)
  gameManager.updateSettings(roomId, host.playerId, {
    ruleId: 'mon',
    ruleParams: { m: 5, n: 2 },
    questionCount: 30,
    winnerCount: 1,
    loserCount: 1,
    isPublic: false,
    questionSetId: null,
  })
  const err = gameManager.joinRoom(roomId, guest.playerId, guest.playerName)
  if (err) { console.error('[Matchmaking] join failed:', err); return }
  gameManager.startGame(roomId)
  if (onMatchCallback) onMatchCallback(roomId, [host.playerId, guest.playerId])
}
