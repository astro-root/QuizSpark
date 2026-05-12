import { io } from 'socket.io-client'
import type { ServerToClientEvents, ClientToServerEvents } from '../types'

const BACKEND = import.meta.env.VITE_API_URL ?? ''

export const socket = io<ServerToClientEvents, ClientToServerEvents>(BACKEND, {
  autoConnect: false,
  withCredentials: true,
})
