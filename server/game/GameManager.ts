import type { RoomState } from '../../src/types'
import { getRuleDef } from './rules'
import {
  createRoom, addPlayer, removePlayer,
  advanceQuestion, skipQuestion, acceptBuzz, applyAnswer, reassignHost, updateSettings,
  BUZZ_TIMEOUT_MS, ANSWER_TIMEOUT_MS, RESULT_SHOW_MS,
} from './RoomState'

type BroadcastFn = (roomId: string, state: RoomState) => void

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // 0/O/1/I/L除外
  let id = ''
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)]
  return id
}

class GameManager {
  private rooms: Map<string, RoomState> = new Map()
  private playerRoomMap: Map<string, string> = new Map()
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map()
  private broadcastFn?: BroadcastFn
  private customQuestionsMap = new Map<string, import('../../src/types').Question[]>()
  private finishFn?: (state: import('../../src/types').RoomState) => void
  private answerLogs = new Map<string, Map<string, Array<{text:string,answer:string,userAnswer:string,isCorrect:boolean,genre:string,questionId:number|null}>>>()

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
    console.log(`[BuzzTimer] roomId=${roomId} delay=${delay}ms timerEndsAt=${state?.timerEndsAt} now=${Date.now()}`)
    const t = setTimeout(() => {
      const s = this.rooms.get(roomId)
      if (!s || s.phase !== 'question') return
      console.log(`[Skip] fired roomId=${roomId} idx=${s.currentQuestionIndex}`)
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
      console.log(`[AnswerTimer] fired roomId=${roomId} phase=${state?.phase} buzzedId=${state?.buzzedPlayerId}`)
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
    if (updated.players.length === 0) { this.rooms.delete(roomId); this.clearTimer(roomId); return null }
    if (state.hostId === playerId) updated = reassignHost(updated)
    this.rooms.set(roomId, updated)
    return roomId
  }


  updateSettings(roomId: string, playerId: string, settings: import('../../src/types').GameSettings): boolean {
    const state = this.rooms.get(roomId)
    if (!state || state.hostId !== playerId || state.phase !== 'lobby') return false
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

  buzz(roomId: string, playerId: string): boolean {
    const state = this.rooms.get(roomId)
    if (!state || state.phase !== 'question') return false
    this.clearTimer(roomId)
    this.rooms.set(roomId, acceptBuzz(state, playerId))
    this.startAnswerTimer(roomId)
    return true
  }

  submitAnswer(roomId: string, playerId: string, rawAnswer: string): void {
    const state = this.rooms.get(roomId)
    if (!state || state.phase !== 'answering') return
    if (state.buzzedPlayerId !== playerId) return
    this.clearTimer(roomId)
    const { nextState } = applyAnswer(state, playerId, rawAnswer)
    if (state.currentQuestion) {
      if (!this.answerLogs.has(roomId)) this.answerLogs.set(roomId, new Map())
      const roomLog = this.answerLogs.get(roomId)!
      if (!roomLog.has(playerId)) roomLog.set(playerId, [])
      const playerLog = roomLog.get(playerId)!
      const isCorrect = (nextState.lastJudgement as any)?.correct ?? false
      playerLog.push({ text: state.currentQuestion.text, answer: (state.currentQuestion as any).displayAnswer || state.currentQuestion.answer, userAnswer: rawAnswer, isCorrect, genre: (state.currentQuestion as any).genre ?? 'ノンジャンル', questionId: (state.currentQuestion as any).id ?? null })
      if (playerLog.length > 10) playerLog.shift()
    }
    this.rooms.set(roomId, nextState)
    this.broadcast(roomId)
    this.startResultTimer(roomId)
  }


  resetGame(roomId: string, playerId: string): boolean {
    const state = this.rooms.get(roomId)
    if (!state || state.hostId !== playerId || state.phase !== 'finished') return false
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
  setCustomQuestions(roomId: string, questions: import('../../src/types').Question[]) { this.customQuestionsMap.set(roomId, questions) }
  setMatchmaking(roomId: string) { const s = this.rooms.get(roomId); if (s) this.rooms.set(roomId, { ...s, isMatchmaking: true }) }
  getCustomQuestions(roomId: string) { return this.customQuestionsMap.get(roomId) }
  getPublicRooms() {
    return [...this.rooms.values()]
      .filter(r => r.settings?.isPublic)
      .map(r => ({ id: r.id, playerCount: r.players.length, hostName: r.players.find(p => p.id === r.hostId)?.name ?? '?', ruleId: r.settings.ruleId, questionCount: r.settings.questionCount, phase: r.phase }))
  }
  getRoomIdByPlayer(playerId: string): string | undefined { return this.playerRoomMap.get(playerId) }
  getAnswerLogs(roomId: string) { return this.answerLogs.get(roomId) }
}

export const gameManager = new GameManager()
