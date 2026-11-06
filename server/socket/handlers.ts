import type { Server, Socket } from 'socket.io'
import type {
  ServerToClientEvents, ClientToServerEvents,
  InterServerEvents, SocketData, RoomState,
} from '../../src/types'
import { gameManager } from '../game/GameManager'
import { prisma } from '../lib/prisma'
import { joinQueue, leaveQueue, setOnMatch } from '../game/MatchmakingManager'
import { toPublicState } from '../game/publicState'
import { toPublicId } from '../game/identity'
import { isValidStamp } from '../../src/lib/stamps'
import { settleGame, type SettleDb } from '../game/settleGame'
import { sanitizeSettings } from '../game/settings'
import { createEventLimiter, SOCKET_LIMITS } from '../lib/eventLimiter'

type IoServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
type IoSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>

function broadcast(io: IoServer, roomId: string, state: RoomState) {
  io.to(roomId).emit('room-update', toPublicState(state))
}

function broadcastPublicRooms(io: IoServer) {
  io.emit('public-rooms', gameManager.getPublicRooms())
}

function getLiveSocket(io: IoServer, token: string) {
  const socketId = gameManager.getSocketId(token)
  if (!socketId) return undefined
  return io.sockets.sockets.get(socketId)
}

let matchCallbackSet = false
let finishCallbackSet = false

function ensureMatchCallback(io: IoServer) {
  if (matchCallbackSet) return
  matchCallbackSet = true
  setOnMatch((roomId, playerIds, stats) => {
    playerIds.forEach((pid, idx) => {
      const s = getLiveSocket(io, pid)
      if (!s) {
        console.warn('[Matchmaking] socket not found for token:', pid)
        return
      }
      s.data.roomId = roomId
      s.join(roomId)
      s.emit('match-found', roomId)
      if (stats) {
        s.emit('prematch-info', {
          myPlayer: stats[idx],
          opponent: stats[1 - idx],
          startsIn: 6000,
        })
      }
    })
    gameManager.setMatchmaking(roomId)
    const state = gameManager.getRoom(roomId)
    // Fix B: マッチ成立通知も sanitizeState を通す
    if (state) io.to(roomId).emit('room-update', toPublicState(state))
  })
}

function setupFinishHandler(io: IoServer) {
  if (finishCallbackSet) return
  finishCallbackSet = true
  gameManager.setOnFinish(async (state) => {
    try {
      const { rateResults } = await settleGame(state, {
        db: prisma as unknown as SettleDb,
        userIdOf: (token) => gameManager.getUserId(token),
        answerLogsOf: (token) => gameManager.getAnswerLogs(state.id)?.get(token) ?? [],
      })
      // rate-result は接続中のプレイヤーにだけ送る(切断者は次回ログイン時にレートで確認できる)
      for (const p of state.players) {
        const userId = gameManager.getUserId(p.id)
        const rr = userId ? rateResults.get(userId) : undefined
        if (rr) getLiveSocket(io, p.id)?.emit('rate-result', rr)
      }
    } catch (e) {
      console.error('[Records] save failed:', e)
    }
  })
}

const cleanName = (v: unknown): string =>
  (typeof v === 'string' ? v.trim().slice(0, 30) : '') || 'プレイヤー'

export function registerHandlers(io: IoServer, socket: IoSocket) {
  ensureMatchCallback(io)
  setupFinishHandler(io)
  socket.emit('public-rooms', gameManager.getPublicRooms())

  const dbUserId = (socket.request as any).user?.id
  if (dbUserId) socket.data.dbUserId = dbUserId

  const rawToken = (socket.handshake.auth as any)?.token
  const token = typeof rawToken === 'string' && rawToken.length > 0 && rawToken.length <= 100
    ? rawToken
    : socket.id
  socket.data.playerId = token
  gameManager.registerSocket(token, socket.id, dbUserId)
  // 自分の公開 ID を通知する(秘密トークンは他プレイヤーに配信される状態には含めない)
  socket.emit('identity', toPublicId(token))

  // 全イベント共通: レート制限 + 例外の捕捉。
  // クライアント由来の引数は信頼せず(型は unknown 扱い)、各ハンドラで検証する。
  // 例外を捕捉しないとプロセス全体が落ちるため、必ずこのラッパー経由で登録する。
  const limiter = createEventLimiter(SOCKET_LIMITS)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const safe = (event: string, fn: (...args: any[]) => unknown) => (...args: any[]): void => {
    if (!limiter.allow(event)) return
    try {
      const r = fn(...args)
      if (r instanceof Promise) r.catch((e: unknown) => console.error(`[Socket] ${event} failed:`, e))
    } catch (e) { console.error(`[Socket] ${event} failed:`, e) }
  }
  const ackOf = <T,>(cb: unknown): ((v: T) => void) => typeof cb === 'function' ? (cb as (v: T) => void) : () => {}

  socket.on('create-room', safe('create-room', (name: unknown, callback: unknown) => {
    const ack = ackOf<string>(callback)
    const roomId = gameManager.createRoom(token, cleanName(name), socket.id)
    socket.data.roomId = roomId
    socket.join(roomId)
    broadcast(io, roomId, gameManager.getRoom(roomId)!)
    broadcastPublicRooms(io)
    ack(roomId)
  }))

  socket.on('join-room', safe('join-room', (roomId: unknown, name: unknown, callback: unknown) => {
    const ack = ackOf<string | null>(callback)
    if (typeof roomId !== 'string' || roomId.length === 0 || roomId.length > 12) { ack('ルームが存在しません'); return }
    const error = gameManager.joinRoom(roomId, token, cleanName(name), socket.id)
    if (error) { ack(error); return }
    socket.data.roomId = roomId
    socket.join(roomId)
    broadcast(io, roomId, gameManager.getRoom(roomId)!)
    broadcastPublicRooms(io)
    ack(null)
  }))

  socket.on('update-settings', safe('update-settings', (raw: unknown) => {
    const roomId = socket.data.roomId
    if (!roomId) return
    const settings = sanitizeSettings(raw)
    if (!settings) return
    if (gameManager.updateSettings(roomId, token, settings))
      broadcast(io, roomId, gameManager.getRoom(roomId)!)
  }))

  socket.on('start-game', safe('start-game', async () => {
    const roomId = socket.data.roomId
    if (!roomId) return
    const state = gameManager.getRoom(roomId)
    if (!state || state.hostId !== token) return
    if (state.settings.questionSetId) {
      try {
        const qSet = await prisma.questionSet.findUnique({ where: { id: state.settings.questionSetId } })
        if (!qSet || (qSet.userId !== socket.data.dbUserId && !qSet.isPublic)) {
          console.warn('[StartGame] unauthorized questionSetId:', state.settings.questionSetId)
          return
        }
        const items = await prisma.questionSetItem.findMany({
          where: { setId: state.settings.questionSetId },
          orderBy: { order: 'asc' },
        })
        const questions = items.map(item => ({
          id: item.id,
          text: item.text,
          answer: item.answer,
          answers: item.answers as string[],
          displayAnswer: item.displayAnswer,
          genre: item.genre,
        }))
        gameManager.setCustomQuestions(roomId, questions)
      } catch (e) {
        console.error('[StartGame] failed to load question set:', e)
      }
    }
    // 公開問題プール使用時のみ: 両プレイヤーの直近20問のquestionIdを収集して除外
    if (!state.settings.questionSetId) {
      const playerIds = state.players
        .map(p => getLiveSocket(io, p.id)?.data?.dbUserId as string | undefined)
        .filter(Boolean) as string[]
      if (playerIds.length > 0) {
        const histories = await prisma.questionHistory.findMany({
          where: { userId: { in: playerIds }, questionId: { not: null } },
          orderBy: { playedAt: 'desc' },
          select: { userId: true, questionId: true },
        })
        // ユーザーごとに直近20戦分の問題IDをすべて収集
        // 1戦 = questionCount問なので最大 20 * questionCount 問分のIDを除外
        const battleSize = state.settings.questionCount
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
    }
    if (gameManager.startGame(roomId)) {
      broadcast(io, roomId, gameManager.getRoom(roomId)!)
      broadcastPublicRooms(io)
    }
  }))

  socket.on('buzz', safe('buzz', () => {
    const roomId = socket.data.roomId
    if (!roomId) return
    if (!gameManager.buzz(roomId, token)) return
    const state = gameManager.getRoom(roomId)!
    io.to(roomId).emit('buzz-accepted', toPublicId(token), state.buzzedPlayerName!)
    broadcast(io, roomId, state)
  }))

  socket.on('submit-answer', safe('submit-answer', (answer: unknown) => {
    const roomId = socket.data.roomId
    if (!roomId || typeof answer !== 'string') return
    gameManager.submitAnswer(roomId, token, answer.slice(0, 200))
  }))

  socket.on('reset-game', safe('reset-game', () => {
    const roomId = socket.data.roomId
    if (!roomId) return
    if (gameManager.resetGame(roomId, token))
      broadcast(io, roomId, gameManager.getRoom(roomId)!)
  }))

  socket.on('join-queue', safe('join-queue', () => {
    const name = (socket.request as any).user?.name ?? 'プレイヤー'
    return joinQueue(token, name, socket.id, socket.data.dbUserId)
  }))

  socket.on('leave-queue', safe('leave-queue', () => { leaveQueue(token) }))

  socket.on('sync-state', safe('sync-state', (roomId: unknown) => {
    if (typeof roomId !== 'string') return
    // 参加者でない人が任意のルームを購読(観戦・盗聴)できないよう、メンバーのみ許可する
    const existing = gameManager.getRoom(roomId)
    if (!existing || !existing.players.some(p => p.id === token)) return
    const reconnected = gameManager.handleReconnect(roomId, token, socket.id)
    const state = gameManager.getRoom(roomId)
    if (!state) return
    socket.data.roomId = roomId
    socket.join(roomId)
    socket.emit('room-update', toPublicState(state))
    if (reconnected) broadcast(io, roomId, state)
  }))

  socket.on('send-stamp', safe('send-stamp', (stamp: unknown) => {
    const roomId = socket.data.roomId
    if (!roomId || !isValidStamp(stamp)) return  // 許可したスタンプ以外(任意の文字列)は中継しない
    const state = gameManager.getRoom(roomId)
    if (!state) return
    const player = state.players.find(p => p.id === token)
    if (!player) return
    const VALID = ['👍','👏','🔥','💪','😲','🤔','😭','🎉']
    if (!VALID.includes(stamp)) return
    io.to(roomId).emit('stamp', { fromId: toPublicId(token), fromName: player.name, stamp })
  }))

  socket.on('send-chat', safe('send-chat', (text: unknown) => {
    const roomId = socket.data.roomId
    if (!roomId || typeof text !== 'string' || !text.trim()) return
    const state = gameManager.getRoom(roomId)
    if (!state) return
    const player = state.players.find(p => p.id === token)
    const name = player?.name ?? (socket.request as any).user?.name ?? 'ゲスト'
    const trimmed = text.trim().slice(0, 100)
    io.to(roomId).emit('chat-message', toPublicId(token), name, trimmed, Date.now())
  }))

  socket.on('disconnect', () => {
    leaveQueue(token)
    const affectedRoomId = gameManager.handleDisconnect(token)
    if (!affectedRoomId) return
    const state = gameManager.getRoom(affectedRoomId)
    if (state) broadcast(io, affectedRoomId, state)
    broadcastPublicRooms(io)
  })
}
