import type { RoomState } from '../../src/types'
import { getRuleDef } from './rules'
import {
  createRoom, addPlayer, removePlayer,
  advanceQuestion, skipQuestion, acceptBuzz, applyAnswer, reassignHost, updateSettings,
  disconnectPlayer, reconnectPlayer, finalizeDisconnect, checkGameEnd,
  BUZZ_TIMEOUT_MS, ANSWER_TIMEOUT_MS, RESULT_SHOW_MS,
} from './RoomState'
import { reconnectManager } from './ReconnectManager'

type BroadcastFn = (roomId: string, state: RoomState) => void

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // 0/O/1/I/L除外
  let id = ''
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)]
  return id
}

class GameManager {
  private rooms: Map<string, RoomState> = new Map()
  // token(=永続プレイヤーID) → roomId
  private playerRoomMap: Map<string, string> = new Map()
  // token → 現在接続中のsocket.id（切断中はundefined相当で存在しない）
  private tokenToSocketId: Map<string, string> = new Map()
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map()
  private broadcastFn?: BroadcastFn
  private customQuestionsMap = new Map<string, import('../../src/types').Question[]>()
  private finishFn?: (state: import('../../src/types').RoomState) => void
  private answerLogs = new Map<string, Map<string, Array<{text:string,answer:string,userAnswer:string,isCorrect:boolean,genre:string,questionId:number|null}>>>()

  constructor() {
    reconnectManager.setFinalizeFn((roomId, token) => this.finalizeDisconnect(roomId, token))
  }

  setBroadcast(fn: BroadcastFn) { this.broadcastFn = fn }
  setOnFinish(fn: (state: import('../../src/types').RoomState) => void) { this.finishFn = fn }

  private broadcast(roomId: string) {
    const state = this.rooms.get(roomId)
    if (state && this.broadcastFn) this.broadcastFn(roomId, state)
  }

  private clearTimer(roomId: string) {
    const t = this.timers.get(roomId)
    if (t) { clearTimeout(t); this.timers.delete(roomId) }
  }

  private startBuzzTimer(roomId: string) {
    this.clearTimer(roomId)
    const state = this.rooms.get(roomId)
    const delay = state?.timerEndsAt ? Math.max(0, state.timerEndsAt - Date.now()) : BUZZ_TIMEOUT_MS
    const t = setTimeout(() => {
      const s = this.rooms.get(roomId)
      if (!s || s.phase !== 'question') return
      const skipped = skipQuestion(s)
      this.rooms.set(roomId, skipped)
      this.broadcast(roomId)
      this.startResultTimer(roomId)
    }, delay)
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
      const next = advanceQuestion(state, this.customQuestionsMap.get(roomId))
      this.rooms.set(roomId, next)
      this.broadcast(roomId)
      if (next.phase === 'question') this.startBuzzTimer(roomId)
      else if (next.phase === 'finished' && this.finishFn) this.finishFn(next)
    }, RESULT_SHOW_MS)
    this.timers.set(roomId, t)
  }

  createRoom(hostToken: string, hostName: string, socketId: string): string {
    let roomId = generateRoomId()
    while (this.rooms.has(roomId)) roomId = generateRoomId()
    this.rooms.set(roomId, createRoom(roomId, hostToken, hostName))
    this.playerRoomMap.set(hostToken, roomId)
    this.tokenToSocketId.set(hostToken, socketId)
    return roomId
  }

  joinRoom(roomId: string, token: string, playerName: string, socketId: string): string | null {
    const state = this.rooms.get(roomId)
    if (!state) return 'ルームが存在しません'
    if (state.phase !== 'lobby') return 'ゲームはすでに開始されています'
    this.rooms.set(roomId, addPlayer(state, token, playerName))
    this.playerRoomMap.set(token, roomId)
    this.tokenToSocketId.set(token, socketId)
    return null
  }

  // 完全退室（ロビー離脱・ルーム消滅時のみ使用。ゲーム中の切断はhandleDisconnectへ）
  leaveRoom(token: string): string | null {
    const roomId = this.playerRoomMap.get(token)
    if (!roomId) return null
    const state = this.rooms.get(roomId)
    if (!state) return null
    let updated = removePlayer(state, token)
    this.playerRoomMap.delete(token)
    this.tokenToSocketId.delete(token)
    reconnectManager.cancelGracePeriod(roomId, token)
    if (updated.players.length === 0) {
      this.rooms.delete(roomId); this.clearTimer(roomId)
      this.answerLogs.delete(roomId); this.customQuestionsMap.delete(roomId)
      return null
    }
    if (state.hostId === token) updated = reassignHost(updated)
    this.rooms.set(roomId, updated)
    return roomId
  }

  // ゲーム中の切断。ロビー中はleaveRoom相当に委譲される。
  handleDisconnect(token: string): string | null {
    const roomId = this.playerRoomMap.get(token)
    if (!roomId) return null
    const state = this.rooms.get(roomId)
    if (!state) return null

    if (state.phase === 'lobby') return this.leaveRoom(token)

    this.tokenToSocketId.delete(token)
    this.rooms.set(roomId, disconnectPlayer(state, token))
    reconnectManager.startGracePeriod(roomId, token)
    return roomId
  }

  // 猶予時間内の再接続。トークンが一致すればACTIVEに復帰する。
  handleReconnect(roomId: string, token: string, socketId: string): boolean {
    const state = this.rooms.get(roomId)
    if (!state) return false
    const player = state.players.find((p) => p.id === token)
    if (!player) return false

    this.tokenToSocketId.set(token, socketId)
    this.playerRoomMap.set(token, roomId)

    if (player.status === 'DISCONNECTED') {
      reconnectManager.cancelGracePeriod(roomId, token)
      this.rooms.set(roomId, reconnectPlayer(state, token))
    }
    return true
  }

  // 猶予切れによる不戦敗確定。ReconnectManagerから呼ばれる。
  private finalizeDisconnect(roomId: string, token: string): void {
    const state = this.rooms.get(roomId)
    if (!state) return
    const player = state.players.find((p) => p.id === token)
    if (!player || player.status !== 'DISCONNECTED') return

    let updated = finalizeDisconnect(state, token)
    if (checkGameEnd(updated)) {
      this.clearTimer(roomId)
      updated = { ...updated, phase: 'finished', currentQuestion: null, timerEndsAt: null }
    }
    this.rooms.set(roomId, updated)
    this.broadcast(roomId)
    if (updated.phase === 'finished' && this.finishFn) this.finishFn(updated)
  }

  updateSettings(roomId: string, token: string, settings: import('../../src/types').GameSettings): boolean {
    const state = this.rooms.get(roomId)
    if (!state || state.hostId !== token || state.phase !== 'lobby') return false
    this.rooms.set(roomId, updateSettings(state, settings))
    return true
  }

  startGame(roomId: string): boolean {
    const state = this.rooms.get(roomId)
    if (!state || state.phase !== 'lobby') return false
    const next = advanceQuestion(state, this.customQuestionsMap.get(roomId))
    this.rooms.set(roomId, next)
    this.broadcast(roomId)
    if (next.phase === 'question') this.startBuzzTimer(roomId)
    return true
  }

  buzz(roomId: string, token: string): boolean {
    const state = this.rooms.get(roomId)
    if (!state || state.phase !== 'question') return false
    const player = state.players.find((p) => p.id === token)
    if (!player || player.status !== 'ACTIVE') return false
    this.clearTimer(roomId)
    this.rooms.set(roomId, acceptBuzz(state, token))
    this.startAnswerTimer(roomId)
    return true
  }

  submitAnswer(roomId: string, token: string, rawAnswer: string): void {
    const state = this.rooms.get(roomId)
    if (!state || state.phase !== 'answering') return
    if (state.buzzedPlayerId !== token) return
    this.clearTimer(roomId)
    const { nextState } = applyAnswer(state, token, rawAnswer)
    if (state.currentQuestion) {
      if (!this.answerLogs.has(roomId)) this.answerLogs.set(roomId, new Map())
      const roomLog = this.answerLogs.get(roomId)!
      if (!roomLog.has(token)) roomLog.set(token, [])
      const playerLog = roomLog.get(token)!
      const isCorrect = nextState.lastJudgement === 'correct'
      playerLog.push({ text: state.currentQuestion.text, answer: (state.currentQuestion as any).displayAnswer || state.currentQuestion.answer, userAnswer: rawAnswer, isCorrect, genre: (state.currentQuestion as any).genre ?? 'ノンジャンル', questionId: (state.currentQuestion as any).id ?? null })
      const logLimit = state.settings?.questionCount ?? 30
      if (playerLog.length > logLimit) playerLog.shift()
    }
    this.rooms.set(roomId, nextState)
    this.broadcast(roomId)
    this.startResultTimer(roomId)
  }

  resetGame(roomId: string, token: string): boolean {
    const state = this.rooms.get(roomId)
    if (!state || state.hostId !== token || state.phase !== 'finished') return false
    this.clearTimer(roomId)
    this.customQuestionsMap.delete(roomId)
    this.answerLogs.delete(roomId)
    const rule = getRuleDef(state.settings.ruleId)
    const players = state.players.map((p: import('../../src/types').Player) => ({
      ...p,
      score: 0,
      status: 'ACTIVE' as const,
      ruleState: rule.initState(state.settings.ruleParams),
    }))
    this.rooms.set(roomId, {
      ...state,
      phase: 'lobby',
      currentQuestionIndex: -1,
      currentQuestion: null,
      buzzedPlayerId: null,
      buzzedPlayerName: null,
      lastJudgement: null,
      lastAnswerPlayerId: null,
      timerEndsAt: null,
      questionOrder: [],
      players,
    })
    return true
  }

  getRoom(roomId: string): RoomState | undefined { return this.rooms.get(roomId) }
  // 接続確立の都度呼ばれる。キュー中・対戦中を問わず、常に最新のsocket.idへ追従させる
  registerSocket(token: string, socketId: string) { this.tokenToSocketId.set(token, socketId) }
  getSocketId(token: string): string | undefined { return this.tokenToSocketId.get(token) }
  setCustomQuestions(roomId: string, questions: import('../../src/types').Question[]) { this.customQuestionsMap.set(roomId, questions) }
  setRecentQuestionIds(roomId: string, ids: number[]) {
    const s = this.rooms.get(roomId)
    if (s) this.rooms.set(roomId, { ...s, recentQuestionIds: ids })
  }
  setMatchmaking(roomId: string) { const s = this.rooms.get(roomId); if (s) this.rooms.set(roomId, { ...s, isMatchmaking: true }) }
  getCustomQuestions(roomId: string) { return this.customQuestionsMap.get(roomId) }
  getPublicRooms() {
    return [...this.rooms.values()]
      .filter(r => r.settings?.isPublic)
      .map(r => ({ id: r.id, playerCount: r.players.length, hostName: r.players.find(p => p.id === r.hostId)?.name ?? '?', ruleId: r.settings.ruleId, questionCount: r.settings.questionCount, phase: r.phase }))
  }
  getRoomIdByPlayer(token: string): string | undefined { return this.playerRoomMap.get(token) }
  getAnswerLogs(roomId: string) { return this.answerLogs.get(roomId) }
}

export const gameManager = new GameManager()
