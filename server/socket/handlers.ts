import type { Server, Socket } from 'socket.io'
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
  RoomState,
} from '../../src/types'
import { gameManager } from '../game/GameManager'

type IoServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
type IoSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>

function broadcast(io: IoServer, roomId: string, state: RoomState) {
  io.to(roomId).emit('room-update', state)
}

export function registerHandlers(io: IoServer, socket: IoSocket) {
  socket.on('create-room', (name, callback) => {
    const roomId = gameManager.createRoom(socket.id, name)
    socket.data.roomId = roomId
    socket.data.playerId = socket.id
    socket.join(roomId)
    const state = gameManager.getRoom(roomId)!
    broadcast(io, roomId, state)
    callback(roomId)
  })

  socket.on('join-room', (roomId, name, callback) => {
    const error = gameManager.joinRoom(roomId, socket.id, name)
    if (error) {
      callback(error)
      return
    }
    socket.data.roomId = roomId
    socket.data.playerId = socket.id
    socket.join(roomId)
    broadcast(io, roomId, gameManager.getRoom(roomId)!)
    callback(null)
  })

  socket.on('update-settings', (settings) => {
    const roomId = socket.data.roomId
    if (!roomId) return
    const ok = gameManager.updateSettings(roomId, socket.id, settings)
    if (!ok) return
    broadcast(io, roomId, gameManager.getRoom(roomId)!)
  })

    socket.on('start-game', () => {
    const roomId = socket.data.roomId
    if (!roomId) return
    const state = gameManager.getRoom(roomId)
    if (!state || state.hostId !== socket.id) return
    const ok = gameManager.startGame(roomId)
    if (!ok) return
    broadcast(io, roomId, gameManager.getRoom(roomId)!)
  })

  socket.on('buzz', () => {
    const roomId = socket.data.roomId
    if (!roomId) return
    const ok = gameManager.buzz(roomId, socket.id)
    if (!ok) return
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
    const ok = gameManager.resetGame(roomId, socket.id)
    if (!ok) return
    broadcast(io, roomId, gameManager.getRoom(roomId)!)
  })

    socket.on('disconnect', () => {
    const affectedRoomId = gameManager.leaveRoom(socket.id)
    if (!affectedRoomId) return
    const state = gameManager.getRoom(affectedRoomId)
    if (state) broadcast(io, affectedRoomId, state)
  })
}
