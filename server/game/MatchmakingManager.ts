import { gameManager } from './GameManager'

const queue: { playerId: string; playerName: string }[] = []

type OnMatchFn = (roomId: string, playerIds: string[]) => void
let onMatchCallback: OnMatchFn | null = null

export function setOnMatch(fn: OnMatchFn) {
  onMatchCallback = fn
}

export function joinQueue(playerId: string, playerName: string): number {
  const idx = queue.findIndex(e => e.playerId === playerId)
  if (idx >= 0) queue.splice(idx, 1)
  queue.push({ playerId, playerName })
  if (queue.length >= 2) {
    const [host, guest] = queue.splice(0, 2)
    createMatch(host, guest)
    return -1
  }
  return queue.findIndex(e => e.playerId === playerId)
}

export function leaveQueue(playerId: string) {
  const idx = queue.findIndex(e => e.playerId === playerId)
  if (idx >= 0) queue.splice(idx, 1)
}

function createMatch(host: { playerId: string; playerName: string }, guest: { playerId: string; playerName: string }) {
  const roomId = gameManager.createRoom(host.playerId, host.playerName)
  gameManager.updateSettings(roomId, host.playerId, {
    ruleId: 'mon',
    ruleParams: { m: 5, n: 2 },
    questionCount: 10,
    winnerCount: 1,
    loserCount: 1,
    isPublic: false,
    questionSetId: null,
  })
  const err = gameManager.joinRoom(roomId, guest.playerId, guest.playerName)
  if (err) { console.error('[Matchmaking] join failed:', err); return }

  const state = gameManager.getRoom(roomId)
  if (state) gameManager['rooms'].set(roomId, { ...state, isMatchmaking: true })

  if (onMatchCallback) onMatchCallback(roomId, [host.playerId, guest.playerId])
}
