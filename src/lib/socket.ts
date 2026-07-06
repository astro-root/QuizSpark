import { io } from 'socket.io-client'
import type { ServerToClientEvents, ClientToServerEvents } from '../types'

const BACKEND = import.meta.env.VITE_API_URL ?? ''

const TOKEN_KEY = 'quizspark_player_token'

export function getOrCreateToken(): string {
  let token = localStorage.getItem(TOKEN_KEY)
  if (!token) {
    token = crypto.randomUUID()
    localStorage.setItem(TOKEN_KEY, token)
  }
  return token
}

export const socket = io<ServerToClientEvents, ClientToServerEvents>(BACKEND, {
  autoConnect: false,
  withCredentials: true,
  auth: { token: getOrCreateToken() },
})
