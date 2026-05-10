import type { RuleId, MatchmakingEntry } from '../../src/types'
import { gameManager } from './GameManager'

// ruleId → キュー
const queues = new Map<string, MatchmakingEntry[]>()

function queueKey(ruleId: RuleId, questionCount: number) {
  return `${ruleId}:${questionCount}`
}

type OnMatchFn = (roomId: string, playerIds: string[]) => void
let onMatchCallback: OnMatchFn | null = null

export function setOnMatch(fn: OnMatchFn) {
  onMatchCallback = fn
}

export function joinQueue(entry: MatchmakingEntry): number {
  const key = queueKey(entry.ruleId, entry.questionCount)
  const q = queues.get(key) ?? []
  // 既にキューに入っていたら更新
  const existing = q.findIndex(e => e.playerId === entry.playerId)
  if (existing >= 0) q.splice(existing, 1)
  q.push(entry)
  queues.set(key, q)

  // 2人以上いたらマッチ成立
  if (q.length >= 2) {
    const matched = q.splice(0, 2)
    queues.set(key, q)
    createMatch(matched)
  }

  return queues.get(key)?.findIndex(e => e.playerId === entry.playerId) ?? -1
}

export function leaveQueue(playerId: string) {
  for (const [key, q] of queues.entries()) {
    const idx = q.findIndex(e => e.playerId === playerId)
    if (idx >= 0) { q.splice(idx, 1); queues.set(key, q); return }
  }
}

function createMatch(entries: MatchmakingEntry[]) {
  const host = entries[0]
  const guest = entries[1]
  const roomId = gameManager.createRoom(host.playerId, host.playerName)
  gameManager.updateSettings(roomId, host.playerId, {
    ruleId: host.ruleId,
    ruleParams: { m: 5, n: 2 },
    questionCount: host.questionCount,
    winnerCount: 1,
    loserCount: 0,
    isPublic: false,
    questionSetId: null,
  })
  const joinErr = gameManager.joinRoom(roomId, guest.playerId, guest.playerName)
  if (joinErr) { console.error('[Matchmaking] join failed:', joinErr); return }
  // 全員に通知してから3秒後に自動スタート
  if (onMatchCallback) onMatchCallback(roomId, [host.playerId, guest.playerId])
  // isMatchmakingフラグをセット
  const state = gameManager.getRoom(roomId)
  if (state) gameManager['rooms'].set(roomId, { ...state, isMatchmaking: true })
  setTimeout(() => {
    gameManager.startGame(roomId)
  }, 3000)
}
