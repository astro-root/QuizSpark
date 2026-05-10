import type { RuleId, MatchmakingEntry } from '../../src/types'
import { gameManager } from './GameManager'

// ruleId → キュー（問題数は問わない）
const queues = new Map<RuleId, MatchmakingEntry[]>()

type OnMatchFn = (roomId: string, playerIds: string[]) => void
let onMatchCallback: OnMatchFn | null = null

export function setOnMatch(fn: OnMatchFn) {
  onMatchCallback = fn
}

export function joinQueue(entry: MatchmakingEntry): number {
  const q = queues.get(entry.ruleId) ?? []
  // 既存エントリを更新
  const idx = q.findIndex(e => e.playerId === entry.playerId)
  if (idx >= 0) q.splice(idx, 1)
  q.push(entry)
  queues.set(entry.ruleId, q)

  if (q.length >= 2) {
    const matched = q.splice(0, 2)
    queues.set(entry.ruleId, q)
    createMatch(matched)
    return -1
  }
  return q.findIndex(e => e.playerId === entry.playerId)
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

  const state = gameManager.getRoom(roomId)
  if (state) gameManager['rooms'].set(roomId, { ...state, isMatchmaking: true })

  if (onMatchCallback) onMatchCallback(roomId, [host.playerId, guest.playerId])

  setTimeout(() => { gameManager.startGame(roomId) }, 3000)
}
