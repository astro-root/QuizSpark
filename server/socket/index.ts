import { Server } from 'socket.io'
import type { Server as HttpServer } from 'http'
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from '../../src/types'
import { registerHandlers } from './handlers'
import { gameManager } from '../game/GameManager'

export function initSocketIO(httpServer: HttpServer) {
  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
    httpServer,
    {
      cors: {
        origin:
          process.env.NODE_ENV === 'production'
            ? false
            : ['http://localhost:5173', 'http://127.0.0.1:5173'],
        methods: ['GET', 'POST'],
      },
    }
  )

  gameManager.setBroadcast((roomId, state) => {
    io.to(roomId).emit('room-update', state)
  })

  io.on('connection', (socket) => {
    console.log(`[Socket] connected: ${socket.id}`)
    registerHandlers(io, socket)
    socket.on('disconnect', () => {
      console.log(`[Socket] disconnected: ${socket.id}`)
    })
  })

  return io
}
