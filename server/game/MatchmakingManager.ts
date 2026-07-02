import { gameManager } from './GameManager'
import { prisma } from '../lib/prisma'
import type { PrematchPlayer } from '../../src/types'

interface QueueEntry {
  playerId: string
  socketId: string
  playerName: string
  rate: number
  dbUserId?: string
  joinedAt: number
}

const queue: QueueEntry[] = []
type OnMatchFn = (roomId: string, playerIds: string[], stats: PrematchPlayer[]) => void
let onMatchCallback: OnMatchFn | null = null

export function setOnMatch(fn: OnMatchFn) {
  onMatchCallback = fn
}

function rateRange(waitMs: number): number {
  if (waitMs < 15000) return 200
  if (waitMs < 30000) return 400
  return Infinity
}

export async function joinQueue(playerId: string, playerName: string, socketId: string, dbUserId?: string) {
  const idx = queue.findIndex(e => e.playerId === playerId)
  if (idx >= 0) queue.splice(idx, 1)

  let rate = 1000
  if (dbUserId) {
    const u = await prisma.user.findUnique({ where: { id: dbUserId }, select: { rate: true } })
    if (u) rate = u.rate
  }

  queue.push({ playerId, socketId, playerName, rate, dbUserId, joinedAt: Date.now() })
  tryMatch()
}

function tryMatch() {
  if (queue.length < 2) return
  const now = Date.now()
  let bestI = -1, bestJ = -1, bestDiff = Infinity

  for (let i = 0; i < queue.length; i++) {
    for (let j = i + 1; j < queue.length; j++) {
      const a = queue[i], b = queue[j]
      const diff = Math.abs(a.rate - b.rate)
      const allowed = Math.min(rateRange(now - a.joinedAt), rateRange(now - b.joinedAt))
      if (diff <= allowed && diff < bestDiff) { bestDiff = diff; bestI = i; bestJ = j }
    }
  }

  if (bestI < 0) return
  const [a, b] = [queue[bestI], queue[bestJ]]
  queue.splice(bestJ, 1)
  queue.splice(bestI, 1)
  createMatch(a, b)
}

setInterval(() => { if (queue.length >= 2) tryMatch() }, 5000)

export function leaveQueue(playerId: string) {
  const idx = queue.findIndex(e => e.playerId === playerId)
  if (idx >= 0) queue.splice(idx, 1)
}

export function getQueueSize(): number { return queue.length }

async function fetchStats(entry: QueueEntry): Promise<PrematchPlayer> {
  let avatarUrl: string | null = null
  let titleId: string | null = null
  let winStreak = 0

  if (entry.dbUserId) {
    const u = await prisma.user.findUnique({
      where: { id: entry.dbUserId },
      select: { avatarUrl: true, titleId: true }
    })
    if (u) { avatarUrl = u.avatarUrl; titleId = u.titleId }

    const records = await prisma.battleRecord.findMany({
      where: { userId: entry.dbUserId },
      orderBy: { playedAt: 'desc' },
      take: 30,
      select: { result: true }
    })
    for (const r of records) {
      if (r.result === 'WIN') winStreak++
      else break
    }
  }

  return { id: entry.playerId, name: entry.playerName, rate: entry.rate, avatarUrl, titleId, winStreak }
}

async function createMatch(host: QueueEntry, guest: QueueEntry) {
  const roomId = gameManager.createRoom(host.playerId, host.playerName, host.socketId)
  gameManager.updateSettings(roomId, host.playerId, {
    ruleId: 'mon',
    ruleParams: { m: 5, n: 2 },
    questionCount: 30,
    winnerCount: 1,
    loserCount: 1,
    isPublic: false,
    questionSetId: null,
  })
  const err = gameManager.joinRoom(roomId, guest.playerId, guest.playerName, guest.socketId)
  if (err) { console.error('[Matchmaking] join failed:', err); return }
  gameManager.setMatchmaking(roomId)

  const [hostStats, guestStats] = await Promise.all([fetchStats(host), fetchStats(guest)])

  if (onMatchCallback) onMatchCallback(roomId, [host.playerId, guest.playerId], [hostStats, guestStats])

  // 5.5秒後にゲーム開始（prematch画面表示時間）
  setTimeout(async () => {
    // 両プレイヤーの直近20戦分の問題IDを除外
    const playerDbIds = [host.dbUserId, guest.dbUserId].filter(Boolean) as string[]
    if (playerDbIds.length > 0) {
      const battleSize = 30 // questionCount
      const histories = await prisma.questionHistory.findMany({
        where: { userId: { in: playerDbIds }, questionId: { not: null } },
        orderBy: { playedAt: 'desc' },
        select: { userId: true, questionId: true },
      })
      const usedIds = new Set<number>()
      const countPerUser = new Map<string, number>()
      for (const h of histories) {
        const cnt = countPerUser.get(h.userId!) ?? 0
        if (cnt < battleSize * 20 && h.questionId) {
          usedIds.add(h.questionId)
          countPerUser.set(h.userId!, cnt + 1)
        }
      }
      gameManager.setRecentQuestionIds(roomId, [...usedIds])
    }
    gameManager.startGame(roomId)
  }, 5500)
}
