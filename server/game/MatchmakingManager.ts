import { gameManager } from './GameManager'

const queue: { playerId: string; playerName: string }[] = []

type OnMatchFn = (roomId: string, playerIds: string[]) => void
let onMatchCallback: OnMatchFn | null = null

export function setOnMatch(fn: OnMatchFn) {
  onMatchCallback = fn
}

export function joinQueue(playerId: string, playerName: string) {
  const idx = queue.findIndex(e => e.playerId === playerId)
  if (idx >= 0) queue.splice(idx, 1)
  queue.push({ playerId, playerName })
  if (queue.length >= 2) {
    const [host, guest] = queue.splice(0, 2)
    createMatch(host, guest)
  }
}

export function leaveQueue(playerId: string) {
  const idx = queue.findIndex(e => e.playerId === playerId)
  if (idx >= 0) queue.splice(idx, 1)
}

function createMatch(
  host: { playerId: string; playerName: string },
  guest: { playerId: string; playerName: string }
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

  // ゲームを先に開始してから通知する
  gameManager.startGame(roomId)

  if (onMatchCallback) onMatchCallback(roomId, [host.playerId, guest.playerId])
}
