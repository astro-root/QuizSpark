import { randomUUID } from 'node:crypto'
import type { RoomState } from '../../src/types'
import { getRuleDef } from './rules'
import {
  createRoom, addPlayer, removePlayer,
  advanceQuestion, skipQuestion, acceptBuzz, applyAnswer, reassignHost, updateSettings,
  disconnectPlayer, reconnectPlayer, finalizeDisconnect, checkGameEnd,
  BUZZ_TIMEOUT_MS, ANSWER_TIMEOUT_MS, RESULT_SHOW_MS,
} from './RoomState'
import { reconnectManager } from './ReconnectManager'
import { emptySecret, joinState, splitState, type RoomSecret } from './secret'

type BroadcastFn = (roomId: string, state: RoomState) => void

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // 0/O/1/I/L除外
  let id = ''
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)]
  return id
}

class GameManager {
  // 保存する状態は「公開状態」のみ(答えを含まない)。答えと出題順は secrets に分けて持つ
  private rooms: Map<string, RoomState> = new Map()
  private secrets: Map<string, RoomSecret> = new Map()
  // token(=永続プレイヤーID) → roomId
  private playerRoomMap: Map<string, string> = new Map()
  // token → 現在接続中のsocket.id（切断中はundefined相当で存在しない）
  private tokenToSocketId: Map<string, string> = new Map()
  // token → ログイン中ユーザーの DB id。切断後も戦績・レート処理ができるよう socket とは独立して保持する
  private tokenToUserId: Map<string, string> = new Map()
  // 終了通知(戦績保存)を1試合につき1回に限定するためのガード
  private finishNotified = new Set<string>()
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

  /** 試合終了を 1 度だけ通知する。切断猶予タイマー等による二重実行(戦績・レートの二重反映)を防ぐ。 */
  private notifyFinish(state: RoomState) {
    if (!this.finishFn) return
    const key = state.gameId ?? state.id
    if (this.finishNotified.has(key)) return
    this.finishNotified.add(key)
    if (this.finishNotified.size > 5000) {
      const oldest = this.finishNotified.values().next().value
      if (oldest !== undefined) this.finishNotified.delete(oldest)
    }
    this.finishFn(state)
  }

  /** 公開状態に秘密を合わせた完全な状態(ゲームロジックへ渡す用。外部へは出さない) */
  private load(roomId: string): RoomState | undefined {
    const pub = this.rooms.get(roomId)
    return pub ? joinState(pub, this.secrets.get(roomId)) : undefined
  }

  /**
   * 状態の唯一の書き込み口。引数は「完全な状態(秘密を含む)」。公開状態と秘密に分けて保存する。
   * フェーズ/問題番号/早押し者が変わったら phaseSeq を進める。
   * タイマーは設定時点の phaseSeq を持ち、発火時に一致しなければ何もしない(古いタイマーの無効化)。
   */
  private commit(roomId: string, next: RoomState): RoomState {
    const prev = this.rooms.get(roomId)
    const transitioned = !!prev && (
      prev.phase !== next.phase ||
      prev.currentQuestionIndex !== next.currentQuestionIndex ||
      prev.buzzedPlayerId !== next.buzzedPlayerId
    )
    const seq = (prev?.phaseSeq ?? next.phaseSeq ?? 0) + (transitioned ? 1 : 0)
    const { pub, secret } = splitState(next.phaseSeq === seq ? next : { ...next, phaseSeq: seq })
    this.rooms.set(roomId, pub)
    this.secrets.set(roomId, secret)
    return pub
  }

  /** クライアントへ配信する。保存されている公開状態(答えを含まない)だけを渡す */
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
    const state = this.load(roomId)
    const seq = state?.phaseSeq
    const delay = state?.timerEndsAt ? Math.max(0, state.timerEndsAt - Date.now()) : BUZZ_TIMEOUT_MS
    const t = setTimeout(() => {
      const s = this.load(roomId)
      if (!s || s.phase !== 'question' || s.phaseSeq !== seq) return
      const skipped = skipQuestion(s)
      this.commit(roomId, skipped)
      this.broadcast(roomId)
      this.startResultTimer(roomId)
    }, delay)
    this.timers.set(roomId, t)
  }

  private startAnswerTimer(roomId: string) {
    this.clearTimer(roomId)
    const seq = this.rooms.get(roomId)?.phaseSeq
    const t = setTimeout(() => {
      const state = this.load(roomId)
      if (!state || state.phase !== 'answering' || state.phaseSeq !== seq) return
      const { nextState } = applyAnswer(state, state.buzzedPlayerId ?? '', '')
      this.commit(roomId, nextState)
      this.broadcast(roomId)
      this.startResultTimer(roomId)
    }, ANSWER_TIMEOUT_MS)
    this.timers.set(roomId, t)
  }

  private startResultTimer(roomId: string) {
    this.clearTimer(roomId)
    const seq = this.rooms.get(roomId)?.phaseSeq
    const t = setTimeout(() => {
      const state = this.load(roomId)
      if (!state || state.phase !== 'result' || state.phaseSeq !== seq) return
      const next = advanceQuestion(state, this.customQuestionsMap.get(roomId))
      this.commit(roomId, next)
      this.broadcast(roomId)
      if (next.phase === 'question') this.startBuzzTimer(roomId)
      else if (next.phase === 'finished') this.notifyFinish(next)
    }, RESULT_SHOW_MS)
    this.timers.set(roomId, t)
  }

  createRoom(hostToken: string, hostName: string, socketId: string): string {
    let roomId = generateRoomId()
    while (this.rooms.has(roomId)) roomId = generateRoomId()
    this.commit(roomId, createRoom(roomId, hostToken, hostName))
    this.playerRoomMap.set(hostToken, roomId)
    this.tokenToSocketId.set(hostToken, socketId)
    return roomId
  }

  joinRoom(roomId: string, token: string, playerName: string, socketId: string): string | null {
    const state = this.load(roomId)
    if (!state) return 'ルームが存在しません'
    if (state.phase !== 'lobby') return 'ゲームはすでに開始されています'
    this.commit(roomId, addPlayer(state, token, playerName))
    this.playerRoomMap.set(token, roomId)
    this.tokenToSocketId.set(token, socketId)
    return null
  }

  // 完全退室（ロビー離脱・ルーム消滅時のみ使用。ゲーム中の切断はhandleDisconnectへ）
  leaveRoom(token: string): string | null {
    const roomId = this.playerRoomMap.get(token)
    if (!roomId) return null
    const state = this.load(roomId)
    if (!state) return null
    let updated = removePlayer(state, token)
    this.playerRoomMap.delete(token)
    this.tokenToSocketId.delete(token)
    reconnectManager.cancelGracePeriod(roomId, token)
    if (updated.players.length === 0) {
      this.rooms.delete(roomId); this.secrets.delete(roomId); this.clearTimer(roomId)
      this.answerLogs.delete(roomId); this.customQuestionsMap.delete(roomId)
      return null
    }
    if (state.hostId === token) updated = reassignHost(updated)
    this.commit(roomId, updated)
    return roomId
  }

  // ゲーム中の切断。ロビー中はleaveRoom相当に委譲される。
  handleDisconnect(token: string): string | null {
    const roomId = this.playerRoomMap.get(token)
    if (!roomId) return null
    const state = this.load(roomId)
    if (!state) return null

    if (state.phase === 'lobby') return this.leaveRoom(token)

    this.tokenToSocketId.delete(token)
    this.commit(roomId, disconnectPlayer(state, token))
    reconnectManager.startGracePeriod(roomId, token)
    return roomId
  }

  // 猶予時間内の再接続。トークンが一致すればACTIVEに復帰する。
  handleReconnect(roomId: string, token: string, socketId: string): boolean {
    const state = this.load(roomId)
    if (!state) return false
    const player = state.players.find((p) => p.id === token)
    if (!player) return false

    this.tokenToSocketId.set(token, socketId)
    this.playerRoomMap.set(token, roomId)

    if (player.status === 'DISCONNECTED') {
      reconnectManager.cancelGracePeriod(roomId, token)
      this.commit(roomId, reconnectPlayer(state, token))
    }
    return true
  }

  // 猶予切れによる不戦敗確定。ReconnectManagerから呼ばれる。
  private finalizeDisconnect(roomId: string, token: string): void {
    const state = this.load(roomId)
    if (!state) return
    const player = state.players.find((p) => p.id === token)
    if (!player || player.status !== 'DISCONNECTED') return

    let updated = finalizeDisconnect(state, token)
    if (checkGameEnd(updated)) {
      this.clearTimer(roomId)
      updated = { ...updated, phase: 'finished', currentQuestion: null, timerEndsAt: null }
    }
    this.commit(roomId, updated)
    this.broadcast(roomId)
    if (updated.phase === 'finished') this.notifyFinish(updated)
  }

  updateSettings(roomId: string, token: string, settings: import('../../src/types').GameSettings): boolean {
    const state = this.load(roomId)
    if (!state || state.hostId !== token || state.phase !== 'lobby') return false
    this.commit(roomId, updateSettings(state, settings))
    return true
  }

  startGame(roomId: string): boolean {
    const state = this.load(roomId)
    if (!state || state.phase !== 'lobby') return false
    const next = { ...advanceQuestion(state, this.customQuestionsMap.get(roomId)), gameId: randomUUID() }
    this.commit(roomId, next)
    this.broadcast(roomId)
    if (next.phase === 'question') this.startBuzzTimer(roomId)
    return true
  }

  buzz(roomId: string, token: string): boolean {
    const state = this.load(roomId)
    if (!state || state.phase !== 'question') return false
    const player = state.players.find((p) => p.id === token)
    if (!player || player.status !== 'ACTIVE') return false
    this.clearTimer(roomId)
    this.commit(roomId, acceptBuzz(state, token))
    this.startAnswerTimer(roomId)
    return true
  }

  submitAnswer(roomId: string, token: string, rawAnswer: string): void {
    const state = this.load(roomId)
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
    this.commit(roomId, nextState)
    this.broadcast(roomId)
    this.startResultTimer(roomId)
  }

  resetGame(roomId: string, token: string): boolean {
    const state = this.load(roomId)
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
    this.commit(roomId, {
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
      gameId: null,
    })
    return true
  }

  /** 公開状態(答えを含まない)。外部へ渡してよいのはこちらだけ */
  getRoom(roomId: string): RoomState | undefined { return this.rooms.get(roomId) }
  // 接続確立の都度呼ばれる。キュー中・対戦中を問わず、常に最新のsocket.idへ追従させる
  registerSocket(token: string, socketId: string, userId?: string | null) {
    this.tokenToSocketId.set(token, socketId)
    if (userId) {
      this.tokenToUserId.delete(token) // 挿入順を更新(古いものから間引くため)
      this.tokenToUserId.set(token, userId)
      if (this.tokenToUserId.size > 20000) {
        const oldest = this.tokenToUserId.keys().next().value
        if (oldest !== undefined) this.tokenToUserId.delete(oldest)
      }
    }
  }
  getUserId(token: string): string | null { return this.tokenToUserId.get(token) ?? null }
  getSocketId(token: string): string | undefined { return this.tokenToSocketId.get(token) }
  setCustomQuestions(roomId: string, questions: import('../../src/types').Question[]) { this.customQuestionsMap.set(roomId, questions) }
  setRecentQuestionIds(roomId: string, ids: number[]) {
    const s = this.load(roomId)
    if (s) this.commit(roomId, { ...s, recentQuestionIds: ids })
  }
  setMatchmaking(roomId: string) { const s = this.load(roomId); if (s) this.commit(roomId, { ...s, isMatchmaking: true }) }
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
