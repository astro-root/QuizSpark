import type { RoomState } from '../../src/types'
import {
  createRoom,
  addPlayer,
  removePlayer,
  advanceQuestion,
  acceptBuzz,
  applyAnswer,
  reassignHost,
  BUZZ_TIMEOUT_MS,
  ANSWER_TIMEOUT_MS,
  RESULT_SHOW_MS,
} from './RoomState'

type BroadcastFn = (roomId: string, state: RoomState) => void

function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

class GameManager {
  private rooms: Map<string, RoomState> = new Map()
  private playerRoomMap: Map<string, string> = new Map()
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map()
  private broadcastFn?: BroadcastFn

  setBroadcast(fn: BroadcastFn) {
    this.broadcastFn = fn
  }

  private broadcast(roomId: string) {
    const state = this.rooms.get(roomId)
    if (state && this.broadcastFn) {
      this.broadcastFn(roomId, state)
    }
  }

  private clearTimer(roomId: string) {
    const t = this.timers.get(roomId)
    if (t) {
      clearTimeout(t)
      this.timers.delete(roomId)
    }
  }

  private startBuzzTimer(roomId: string) {
    this.clearTimer(roomId)
    const t = setTimeout(() => {
      const state = this.rooms.get(roomId)
      if (!state || state.phase !== 'question') return
      const next = advanceQuestion(state)
      this.rooms.set(roomId, next)
      this.broadcast(roomId)
      if (next.phase === 'question') {
        this.startBuzzTimer(roomId)
      }
    }, BUZZ_TIMEOUT_MS)
    this.timers.set(roomId, t)
  }

  private startAnswerTimer(roomId: string) {
    this.clearTimer(roomId)
    const t = setTimeout(() => {
      const state = this.rooms.get(roomId)
      if (!state || state.phase !== 'answering') return
      const { nextState } = applyAnswer(state, state.buzzedPlayerId ?? '', '')
      this.rooms.set(roomId, nextState)
      this.broadcast(roomId)
      this.startResultTimer(roomId)
    }, ANSWER_TIMEOUT_MS)
    this.timers.set(roomId, t)
  }

  private startResultTimer(roomId: string) {
    this.clearTimer(roomId)
    const t = setTimeout(() => {
      const state = this.rooms.get(roomId)
      if (!state || state.phase !== 'result') return
      const next = advanceQuestion(state)
      this.rooms.set(roomId, next)
      this.broadcast(roomId)
      if (next.phase === 'question') {
        this.startBuzzTimer(roomId)
      }
    }, RESULT_SHOW_MS)
    this.timers.set(roomId, t)
  }

  createRoom(hostId: string, hostName: string): string {
    let roomId = generateRoomId()
    while (this.rooms.has(roomId)) roomId = generateRoomId()
    this.rooms.set(roomId, createRoom(roomId, hostId, hostName))
    this.playerRoomMap.set(hostId, roomId)
    return roomId
  }

  joinRoom(roomId: string, playerId: string, playerName: string): string | null {
    const state = this.rooms.get(roomId)
    if (!state) return 'ルームが存在しません'
    if (state.phase !== 'lobby') return 'ゲームはすでに開始されています'
    this.rooms.set(roomId, addPlayer(state, playerId, playerName))
    this.playerRoomMap.set(playerId, roomId)
    return null
  }

  leaveRoom(playerId: string): string | null {
    const roomId = this.playerRoomMap.get(playerId)
    if (!roomId) return null
    const state = this.rooms.get(roomId)
    if (!state) return null
    let updated = removePlayer(state, playerId)
    this.playerRoomMap.delete(playerId)
    if (updated.players.length === 0) {
      this.rooms.delete(roomId)
      this.clearTimer(roomId)
      return null
    }
    if (state.hostId === playerId) {
      updated = reassignHost(updated)
    }
    this.rooms.set(roomId, updated)
    return roomId
  }

  startGame(roomId: string): boolean {
    const state = this.rooms.get(roomId)
    if (!state || state.phase !== 'lobby') return false
    const next = advanceQuestion(state)
    this.rooms.set(roomId, next)
    if (next.phase === 'question') this.startBuzzTimer(roomId)
    return true
  }

  buzz(roomId: string, playerId: string): boolean {
    const state = this.rooms.get(roomId)
    if (!state || state.phase !== 'question') return false
    this.clearTimer(roomId)
    const next = acceptBuzz(state, playerId)
    this.rooms.set(roomId, next)
    this.startAnswerTimer(roomId)
    return true
  }

  submitAnswer(roomId: string, playerId: string, rawAnswer: string): void {
    const state = this.rooms.get(roomId)
    if (!state || state.phase !== 'answering') return
    if (state.buzzedPlayerId !== playerId) return
    this.clearTimer(roomId)
    const { nextState } = applyAnswer(state, playerId, rawAnswer)
    this.rooms.set(roomId, nextState)
    this.broadcast(roomId)
    this.startResultTimer(roomId)
  }

  getRoom(roomId: string): RoomState | undefined {
    return this.rooms.get(roomId)
  }

  getRoomIdByPlayer(playerId: string): string | undefined {
    return this.playerRoomMap.get(playerId)
  }
}

export const gameManager = new GameManager()
