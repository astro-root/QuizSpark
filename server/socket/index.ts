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
import { sessionMiddleware } from '../lib/sessionMiddleware'
import passport from '../auth/passport'

export function initSocketIO(httpServer: HttpServer) {
  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
    httpServer,
    {
      cors: {
        origin: ['https://quiz.astro-root.com', 'http://localhost:5173'],
        credentials: true,
        methods: ['GET', 'POST'],
      },
    }
  )

  gameManager.setBroadcast((roomId, state) => {
    io.to(roomId).emit('room-update', state)
  })

  // セッション共有
  const wrap = (m: any) => (s: any, n: any) => m(s.request, {}, n)
  io.use(wrap(sessionMiddleware))
  io.use(wrap(passport.initialize()))
  io.use(wrap(passport.session()))

  io.on('connection', (socket) => {
    console.log(`[Socket] connected: ${socket.id}`)
    registerHandlers(io, socket)
    socket.on('disconnect', () => {
      console.log(`[Socket] disconnected: ${socket.id}`)
    })
  })

  return io
}
