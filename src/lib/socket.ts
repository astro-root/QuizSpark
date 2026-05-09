import { io } from 'socket.io-client'
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from '../types'

const URL =
  import.meta.env.MODE === 'development'
    ? 'http://localhost:3000'
    : window.location.origin

export const socket = io<ServerToClientEvents, ClientToServerEvents>(URL, {
  autoConnect: false,
})
