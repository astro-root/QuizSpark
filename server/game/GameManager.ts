import type { RoomState } from '../../src/types'
import {
  createRoom,
  addPlayer,
  removePlayer,
  startGame,
  advanceQuestion,
  acceptBuzz,
  applyJudgement,
} from './RoomState'

function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

class GameManager {
  private rooms: Map<string, RoomState> = new Map()
  private playerRoomMap: Map<string, string> = new Map()

  createRoom(hostId: string, hostName: string): string {
    let roomId = generateRoomId()
    while (this.rooms.has(roomId)) {
      roomId = generateRoomId()
    }
    const state = createRoom(roomId, hostId, hostName)
    this.rooms.set(roomId, state)
    this.playerRoomMap.set(hostId, roomId)
    return roomId
  }

  joinRoom(roomId: string, playerId: string, playerName: string): string | null {
    const state = this.rooms.get(roomId)
    if (!state) return 'ルームが存在しません'
    if (state.phase !== 'lobby') return 'ゲームはすでに開始されています'
    const updated = addPlayer(state, playerId, playerName)
    this.rooms.set(roomId, updated)
    this.playerRoomMap.set(playerId, roomId)
    return null
  }

  leaveRoom(playerId: string): string | null {
    const roomId = this.playerRoomMap.get(playerId)
    if (!roomId) return null
    const state = this.rooms.get(roomId)
    if (!state) return null
    const updated = removePlayer(state, playerId)
    this.playerRoomMap.delete(playerId)
    if (updated.players.length === 0) {
      this.rooms.delete(roomId)
      return null
    }
    if (state.hostId === playerId && updated.players.length > 0) {
      const newHost = updated.players[0]
      const reassigned: RoomState = {
        ...updated,
        hostId: newHost.id,
        players: updated.players.map((p) =>
          p.id === newHost.id ? { ...p, isHost: true } : p
        ),
      }
      this.rooms.set(roomId, reassigned)
      return roomId
    }
    this.rooms.set(roomId, updated)
    return roomId
  }

  startGame(roomId: string): boolean {
    const state = this.rooms.get(roomId)
    if (!state || state.phase !== 'lobby') return false
    this.rooms.set(roomId, startGame(state))
    return true
  }

  buzz(roomId: string, playerId: string): boolean {
    const state = this.rooms.get(roomId)
    if (!state || state.phase !== 'question') return false
    this.rooms.set(roomId, acceptBuzz(state, playerId))
    return true
  }

  judge(roomId: string, correct: boolean): void {
    const state = this.rooms.get(roomId)
    if (!state) return
    this.rooms.set(roomId, applyJudgement(state, correct))
  }

  nextQuestion(roomId: string): void {
    const state = this.rooms.get(roomId)
    if (!state) return
    this.rooms.set(roomId, advanceQuestion(state))
  }

  getRoom(roomId: string): RoomState | undefined {
    return this.rooms.get(roomId)
  }

  getRoomIdByPlayer(playerId: string): string | undefined {
    return this.playerRoomMap.get(playerId)
  }
}

export const gameManager = new GameManager()
