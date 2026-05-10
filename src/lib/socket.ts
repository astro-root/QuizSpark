import { io } from 'socket.io-client'
import type { ServerToClientEvents, ClientToServerEvents } from '../types'

export const socket = io<ServerToClientEvents, ClientToServerEvents>({
  autoConnect: false,
})
