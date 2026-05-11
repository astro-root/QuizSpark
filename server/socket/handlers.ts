import type { Server, Socket } from 'socket.io'
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
  RoomState,
} from '../../src/types'
import { gameManager } from '../game/GameManager'
import { prisma } from '../lib/prisma'
import { joinQueue, leaveQueue, setOnMatch } from '../game/MatchmakingManager'

type IoServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
type IoSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>

function broadcast(io: IoServer, roomId: string, state: RoomState) {
  io.to(roomId).emit('room-update', state)
}

// socketId → DB userId
const userIdMap = new Map<string, string>()

// マッチメイキング成立時の処理（一度だけ設定）
let matchCallbackSet = false
function ensureMatchCallback(io: IoServer) {
  if (matchCallbackSet) return
  matchCallbackSet = true
  setOnMatch((roomId, playerIds) => {
    for (const pid of playerIds) {
      io.sockets.sockets.forEach(s => {
        if (s.id === pid) {
          s.data.roomId = roomId
          s.data.playerId = pid
          s.join(roomId)
          s.emit('match-found', roomId)
        }
      })
    }
    const state = gameManager.getRoom(roomId)
    if (state) io.to(roomId).emit('room-update', state)
  })
}

// ゲーム終了時に戦績を保存
gameManager.setOnFinish(async (state) => {
  try {
    const data = state.players.flatMap(p => {
      const userId = userIdMap.get(p.id)
      if (!userId) return []
      return [{
        id: `${state.id}-${userId}`,
        userId,
        roomId: state.id,
        ruleId: state.settings?.ruleId ?? 'free',
        result: p.status === 'WIN' ? 'WIN' : p.status === 'LOSE' ? 'LOSE' : 'ACTIVE',
        correct: (p.ruleState?.correct as number) ?? 0,
        wrong: (p.ruleState?.wrong as number) ?? 0,
        score: p.score,
        playerCount: state.players.length,
      }]
    })
    if (data.length > 0) {
      await prisma.battleRecord.createMany({ data, skipDuplicates: true })
      // レート更新
      for (const d of data) {
        if (!d.userId) continue
        const delta = d.result === 'WIN' ? 30 : d.result === 'LOSE' ? -20 : 0
        if (delta === 0) continue
        const user = await prisma.user.findUnique({ where: { id: d.userId }, select: { rate: true } })
        if (!user) continue
        await prisma.user.update({
          where: { id: d.userId },
          data: { rate: Math.max(0, user.rate + delta) }
        })
      }
    }
  } catch (e) {
    console.error('[Records] save failed:', e)
  }
})

export function registerHandlers(io: IoServer, socket: IoSocket) {
  ensureMatchCallback(io)

  // DB userIdをsocketに紐付け
  const dbUserId = (socket.request as any).user?.id
  if (dbUserId) userIdMap.set(socket.id, dbUserId)

  socket.on('create-room', (name, callback) => {
    const roomId = gameManager.createRoom(socket.id, name)
    socket.data.roomId = roomId
    socket.data.playerId = socket.id
    socket.join(roomId)
    broadcast(io, roomId, gameManager.getRoom(roomId)!)
    callback(roomId)
  })

  socket.on('join-room', (roomId, name, callback) => {
    const error = gameManager.joinRoom(roomId, socket.id, name)
    if (error) { callback(error); return }
    socket.data.roomId = roomId
    socket.data.playerId = socket.id
    socket.join(roomId)
    broadcast(io, roomId, gameManager.getRoom(roomId)!)
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
    // 問題セットが指定されていればDB読み込み
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
    if (gameManager.startGame(roomId))
      broadcast(io, roomId, gameManager.getRoom(roomId)!)
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
    joinQueue(socket.id, name, userIdMap.get(socket.id))
  })

  socket.on('leave-queue', () => {
    leaveQueue(socket.id)
  })

  socket.on('sync-state', (roomId: string) => {
    const state = gameManager.getRoom(roomId)
    if (state) {
      socket.data.roomId = roomId
      socket.join(roomId)
      socket.emit('room-update', state)
    }
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
    userIdMap.delete(socket.id)
    const affectedRoomId = gameManager.leaveRoom(socket.id)
    if (!affectedRoomId) return
    const state = gameManager.getRoom(affectedRoomId)
    if (state) broadcast(io, affectedRoomId, state)
  })
}
