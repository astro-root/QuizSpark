import { Server } from 'socket.io'
import type { HttpServer } from 'vite'
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from '../../src/types'
import { registerHandlers } from './handlers'

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

  io.on('connection', (socket) => {
    console.log(`[Socket] connected: ${socket.id}`)
    registerHandlers(io, socket)
    socket.on('disconnect', () => {
      console.log(`[Socket] disconnected: ${socket.id}`)
    })
  })

  return io
}
