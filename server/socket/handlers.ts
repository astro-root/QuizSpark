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

let matchCallbackSet = false
let finishCallbackSet = false

function ensureMatchCallback(io: IoServer) {
  if (matchCallbackSet) return
  matchCallbackSet = true
  setOnMatch((roomId, playerIds, stats) => {
    playerIds.forEach((pid, idx) => {
      io.sockets.sockets.forEach(s => {
        if (s.id === pid) {
          s.data.roomId = roomId
          s.data.playerId = pid
          s.join(roomId)
          s.emit('match-found', roomId)
          if (stats) {
            s.emit('prematch-info', {
              myPlayer: stats[idx],
              opponent: stats[1 - idx],
              startsIn: 6000,
            })
          }
        }
      })
    })
    gameManager.setMatchmaking(roomId)
    const state = gameManager.getRoom(roomId)
    if (state) io.to(roomId).emit('room-update', state)
  })
}

function setupFinishHandler(io: IoServer) {
  if (finishCallbackSet) return
  finishCallbackSet = true
  gameManager.setOnFinish(async (state) => {
    try {
      const data = state.players.flatMap(p => {
        const pSocket = io.sockets.sockets.get(p.id)
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
        await prisma.battleRecord.createMany({ data, skipDuplicates: true })
        for (const p of state.players) {
          const pSocket = io.sockets.sockets.get(p.id)
          const userId = pSocket?.data?.dbUserId ?? null
          if (!userId) continue
          const logs = gameManager.getAnswerLogs(state.id)?.get(p.id) ?? []
          if (logs.length === 0) continue
          await prisma.questionHistory.createMany({
            data: logs.map(l => ({ userId, text: l.text, answer: l.answer, userAnswer: l.userAnswer, isCorrect: l.isCorrect, genre: l.genre ?? 'ノンジャンル', questionId: l.questionId ?? null }))
          })
          const all = await prisma.questionHistory.findMany({ where: { userId }, orderBy: { playedAt: 'desc' }, select: { id: true } })
          if (all.length > 10) {
            await prisma.questionHistory.deleteMany({ where: { id: { in: all.slice(10).map(h => h.id) } } })
          }
        }
        console.log('[Rate] data:', JSON.stringify(data.map(d => ({userId:d.userId,result:d.result,isMatchmaking:d.isMatchmaking}))))
        if (state.isMatchmaking && data.every(d => d.result === 'ACTIVE') && data.length >= 2) {
          const byScore = [...state.players].sort((a, b) => b.score - a.score)
          data.forEach(d => {
            const player = state.players.find(p => (io.sockets.sockets.get(p.id)?.data?.dbUserId) === d.userId)
            if (!player) return
            const rank = byScore.findIndex(p => p.id === player.id)
            if (rank === 0) (d as any).result = 'WIN'
            else if (rank === byScore.length - 1) (d as any).result = 'LOSE'
          })
        }
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
          const pSocket = io.sockets.sockets.get(p.id)
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

  socket.on('create-room', (name, callback) => {
    const roomId = gameManager.createRoom(socket.id, name)
    socket.data.roomId = roomId
    socket.data.playerId = socket.id
    socket.join(roomId)
    broadcast(io, roomId, gameManager.getRoom(roomId)!)
    broadcastPublicRooms(io)
    callback(roomId)
  })

  socket.on('join-room', (roomId, name, callback) => {
    const error = gameManager.joinRoom(roomId, socket.id, name)
    if (error) { callback(error); return }
    socket.data.roomId = roomId
    socket.data.playerId = socket.id
    socket.join(roomId)
    broadcast(io, roomId, gameManager.getRoom(roomId)!)
    broadcastPublicRooms(io)
    callback(null)
  })

  socket.on('update-settings', (settings) => {
    const roomId = socket.data.roomId
    if (!roomId) return
    if (gameManager.updateSettings(roomId, socket.id, settings))
      broadcast(io, roomId, gameManager.getRoom(roomId)!)
  })

  socket.on('start-game', async () => {
    const roomId = socket.data.roomId
    if (!roomId) return
    const state = gameManager.getRoom(roomId)
    if (!state || state.hostId !== socket.id) return
    if (state.settings.questionSetId) {
      try {
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
        }))
        gameManager.setCustomQuestions(roomId, questions)
      } catch (e) {
        console.error('[StartGame] failed to load question set:', e)
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
    if (!gameManager.buzz(roomId, socket.id)) return
    const state = gameManager.getRoom(roomId)!
    io.to(roomId).emit('buzz-accepted', socket.id, state.buzzedPlayerName!)
    broadcast(io, roomId, state)
  })

  socket.on('submit-answer', (answer) => {
    const roomId = socket.data.roomId
    if (!roomId) return
    gameManager.submitAnswer(roomId, socket.id, answer)
  })

  socket.on('reset-game', () => {
    const roomId = socket.data.roomId
    if (!roomId) return
    if (gameManager.resetGame(roomId, socket.id))
      broadcast(io, roomId, gameManager.getRoom(roomId)!)
  })

  socket.on('join-queue', () => {
    const name = (socket.request as any).user?.name ?? 'プレイヤー'
    joinQueue(socket.id, name, socket.data.dbUserId)
  })

  socket.on('leave-queue', () => { leaveQueue(socket.id) })

  socket.on('sync-state', (roomId: string) => {
    const state = gameManager.getRoom(roomId)
    if (state) {
      socket.data.roomId = roomId
      socket.join(roomId)
      socket.emit('room-update', state)
    }
  })

  socket.on('send-stamp', (stamp: string) => {
    const roomId = socket.data.roomId
    if (!roomId) return
    const state = gameManager.getRoom(roomId)
    if (!state) return
    const player = state.players.find(p => p.id === socket.id)
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
    const player = state.players.find(p => p.id === socket.id)
    const name = player?.name ?? (socket.request as any).user?.name ?? 'ゲスト'
    const safe = text.trim().slice(0, 100)
    io.to(roomId).emit('chat-message', socket.id, name, safe, Date.now())
  })

  socket.on('disconnect', () => {
    leaveQueue(socket.id)
    const affectedRoomId = gameManager.leaveRoom(socket.id)
    if (!affectedRoomId) return
    const state = gameManager.getRoom(affectedRoomId)
    if (state) broadcast(io, affectedRoomId, state)
    broadcastPublicRooms(io)
  })
}
