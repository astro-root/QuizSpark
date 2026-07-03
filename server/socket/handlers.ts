import type { Server, Socket } from 'socket.io'
import type {
  ServerToClientEvents, ClientToServerEvents,
  InterServerEvents, SocketData, RoomState,
} from '../../src/types'
import { gameManager } from '../game/GameManager'
import { prisma } from '../lib/prisma'
import { joinQueue, leaveQueue, setOnMatch } from '../game/MatchmakingManager'

type IoServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
type IoSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>

function sanitizeState(state: RoomState): RoomState {
  if (!state.currentQuestion) return state
  return {
    ...state,
    currentQuestion: state.phase === 'question' || state.phase === 'answering'
      ? { ...state.currentQuestion, answer: '', answers: [] }
      : state.currentQuestion
  }
}

function broadcast(io: IoServer, roomId: string, state: RoomState) {
  io.to(roomId).emit('room-update', sanitizeState(state))
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
    if (state) io.to(roomId).emit('room-update', sanitizeState(state))
  })
}

function setupFinishHandler(io: IoServer) {
  if (finishCallbackSet) return
  finishCallbackSet = true
  gameManager.setOnFinish(async (state) => {
    try {
      const data = state.players.flatMap(p => {
        const pSocket = getLiveSocket(io, p.id)
        const userId = pSocket?.data?.dbUserId ?? null
        if (!userId) return []
        return [{
          id: `${state.id}-${userId}`,
          userId,
          roomId: state.id,
          ruleId: state.settings?.ruleId ?? 'free',
          isMatchmaking: !!(state.isMatchmaking),
          result: p.status === 'WIN' ? 'WIN' : p.status === 'LOSE' ? 'LOSE' : 'ACTIVE',
          correct: (p.ruleState?.correct as number) ?? 0,
          wrong: (p.ruleState?.wrong as number) ?? 0,
          score: p.score,
          playerCount: state.players.length,
        }]
      })
      if (data.length > 0) {
        for (const p of state.players) {
          const pSocket = getLiveSocket(io, p.id)
          const userId = pSocket?.data?.dbUserId ?? null
          if (!userId) continue
          const logs = gameManager.getAnswerLogs(state.id)?.get(p.id) ?? []
          if (logs.length === 0) continue
          await prisma.questionHistory.createMany({
            data: logs.map(l => ({ userId, text: l.text, answer: l.answer, userAnswer: l.userAnswer, isCorrect: l.isCorrect, genre: l.genre ?? 'ノンジャンル', questionId: l.questionId ?? null }))
          })
          const all = await prisma.questionHistory.findMany({ where: { userId }, orderBy: { playedAt: 'desc' }, select: { id: true } })
          // Fix D: 保存上限を questionCount に合わせる（旧: 10件固定）
          const historyLimit = (state.settings?.questionCount ?? 30) * 20
          if (all.length > historyLimit) {
            await prisma.questionHistory.deleteMany({ where: { id: { in: all.slice(historyLimit).map(h => h.id) } } })
          }
        }
        // Fix C: ACTIVE→WIN/LOSE 変換を battleRecord 保存より先に実行
        if (state.isMatchmaking && data.every(d => d.result === 'ACTIVE') && data.length >= 2) {
          const byScore = [...state.players].sort((a, b) => b.score - a.score)
          data.forEach(d => {
            const player = state.players.find(p => (getLiveSocket(io, p.id)?.data?.dbUserId) === d.userId)
            if (!player) return
            const rank = byScore.findIndex(p => p.id === player.id)
            if (rank === 0) (d as any).result = 'WIN'
            else if (rank === byScore.length - 1) (d as any).result = 'LOSE'
          })
        }
        // Fix C: 変換後の result で battleRecord を保存
        await prisma.battleRecord.createMany({ data, skipDuplicates: true })
        console.log('[Rate] data:', JSON.stringify(data.map(d => ({userId:d.userId,result:d.result,isMatchmaking:d.isMatchmaking}))))
        const rateTargets = data.filter(d => d.isMatchmaking && d.userId && (d.result === 'WIN' || d.result === 'LOSE'))
        console.log('[Rate] targets:', rateTargets.length)
        const rateResultMap = new Map<string, { result: string; oldRate: number; newRate: number; delta: number }>()
        if (rateTargets.length > 0) {
          await prisma.$transaction(async (tx) => {
            for (const d of rateTargets) {
              const delta = d.result === 'WIN' ? 30 : -20
              const user = await tx.user.findUnique({ where: { id: d.userId! }, select: { rate: true } })
              if (!user) continue
              const oldRate = user.rate
              const newRate = Math.max(0, user.rate + delta)
              await tx.user.update({ where: { id: d.userId! }, data: { rate: newRate } })
              rateResultMap.set(d.userId!, { result: d.result, oldRate, newRate, delta })
            }
          })
        }
        // rate-result を各プレイヤーに送信
        for (const p of state.players) {
          const pSocket = getLiveSocket(io, p.id)
          const userId = pSocket?.data?.dbUserId ?? null
          if (!userId || !pSocket) continue
          const rr = rateResultMap.get(userId)
          if (rr) pSocket.emit('rate-result', rr as any)
        }
      }
    } catch (e) {
      console.error('[Records] save failed:', e)
    }
  })
}

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

  socket.on('create-room', (name, callback) => {
    const roomId = gameManager.createRoom(token, name, socket.id)
    socket.data.roomId = roomId
    socket.join(roomId)
    broadcast(io, roomId, gameManager.getRoom(roomId)!)
    broadcastPublicRooms(io)
    callback(roomId)
  })

  socket.on('join-room', (roomId, name, callback) => {
    const error = gameManager.joinRoom(roomId, token, name, socket.id)
    if (error) { callback(error); return }
    socket.data.roomId = roomId
    socket.join(roomId)
    broadcast(io, roomId, gameManager.getRoom(roomId)!)
    broadcastPublicRooms(io)
    callback(null)
  })

  socket.on('update-settings', (settings) => {
    const roomId = socket.data.roomId
    if (!roomId) return
    if (gameManager.updateSettings(roomId, token, settings))
      broadcast(io, roomId, gameManager.getRoom(roomId)!)
  })

  socket.on('start-game', async () => {
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
  })

  socket.on('buzz', () => {
    const roomId = socket.data.roomId
    if (!roomId) return
    if (!gameManager.buzz(roomId, token)) return
    const state = gameManager.getRoom(roomId)!
    io.to(roomId).emit('buzz-accepted', token, state.buzzedPlayerName!)
    broadcast(io, roomId, state)
  })

  socket.on('submit-answer', (answer) => {
    const roomId = socket.data.roomId
    if (!roomId) return
    gameManager.submitAnswer(roomId, token, answer)
  })

  socket.on('reset-game', () => {
    const roomId = socket.data.roomId
    if (!roomId) return
    if (gameManager.resetGame(roomId, token))
      broadcast(io, roomId, gameManager.getRoom(roomId)!)
  })

  socket.on('join-queue', () => {
    const name = (socket.request as any).user?.name ?? 'プレイヤー'
    joinQueue(token, name, socket.id, socket.data.dbUserId)
  })

  socket.on('leave-queue', () => { leaveQueue(token) })

  socket.on('sync-state', (roomId: string) => {
    const reconnected = gameManager.handleReconnect(roomId, token, socket.id)
    const state = gameManager.getRoom(roomId)
    if (!state) return
    socket.data.roomId = roomId
    socket.join(roomId)
    socket.emit('room-update', sanitizeState(state))
    if (reconnected) broadcast(io, roomId, state)
  })

  socket.on('send-stamp', (stamp: string) => {
    const roomId = socket.data.roomId
    if (!roomId) return
    const state = gameManager.getRoom(roomId)
    if (!state) return
    const player = state.players.find(p => p.id === token)
    if (!player) return
    const VALID = ['👍','👏','🔥','💪','😲','🤔','😭','🎉']
    if (!VALID.includes(stamp)) return
    io.to(roomId).emit('stamp', { fromId: socket.id, fromName: player.name, stamp })
  })

  socket.on('send-chat', (text) => {
    const roomId = socket.data.roomId
    if (!roomId || !text?.trim()) return
    const state = gameManager.getRoom(roomId)
    if (!state) return
    const player = state.players.find(p => p.id === token)
    const name = player?.name ?? (socket.request as any).user?.name ?? 'ゲスト'
    const safe = text.trim().slice(0, 100)
    io.to(roomId).emit('chat-message', socket.id, name, safe, Date.now())
  })

  socket.on('disconnect', () => {
    leaveQueue(token)
    const affectedRoomId = gameManager.handleDisconnect(token)
    if (!affectedRoomId) return
    const state = gameManager.getRoom(affectedRoomId)
    if (state) broadcast(io, affectedRoomId, state)
    broadcastPublicRooms(io)
  })
}
