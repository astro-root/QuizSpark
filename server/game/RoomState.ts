import type { Player, RoomState, GameSettings } from '../../src/types'
import { getQuizData } from './quizData'
import { getRuleDef, DEFAULT_SETTINGS } from './rules'

export const BUZZ_TIMEOUT_MS = 5000
export const ANSWER_TIMEOUT_MS = 8000
export const RESULT_SHOW_MS = 2500
const Q_DISPLAY_MS = 1500
const TYPEWRITER_SPEED_MS = 120

export function normalizeAnswer(input: string): string {
  let s = input
  s = s.replace(/[\u30A1-\u30F6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
  s = s.replace(/[^\u3041-\u3096a-zA-Z]/g, '')
  return s.toLowerCase()
}

function initPlayer(id: string, name: string, isHost: boolean, settings: GameSettings): Player {
  const rule = getRuleDef(settings.ruleId)
  return {
    id, name, score: 0, isHost,
    status: 'ACTIVE',
    ruleState: rule.initState(settings.ruleParams),
  }
}

export function createRoom(roomId: string, hostId: string, hostName: string): RoomState {
  const settings = { ...DEFAULT_SETTINGS }
  return {
    id: roomId,
    hostId,
    players: [initPlayer(hostId, hostName, true, settings)],
    phase: 'lobby',
    currentQuestionIndex: -1,
    currentQuestion: null,
    buzzedPlayerId: null,
    buzzedPlayerName: null,
    lastJudgement: null,
    lastAnswerPlayerId: null,
    timerEndsAt: null,
    totalQuestions: settings.questionCount,
    questionOrder: [],
    settings,
  }
}

export function updateSettings(state: RoomState, settings: GameSettings): RoomState {
  // settingsが変わったらruleStateを再初期化
  const rule = getRuleDef(settings.ruleId)
  const players = state.players.map(p => ({
    ...p,
    status: 'ACTIVE' as const,
    ruleState: rule.initState(settings.ruleParams),
  }))
  return { ...state, settings, players, totalQuestions: settings.questionCount }
}

export function addPlayer(state: RoomState, playerId: string, playerName: string): RoomState {
  if (state.players.find((p) => p.id === playerId)) return state
  return {
    ...state,
    players: [...state.players, initPlayer(playerId, playerName, false, state.settings)],
  }
}

export function removePlayer(state: RoomState, playerId: string): RoomState {
  return { ...state, players: state.players.filter((p) => p.id !== playerId) }
}

function shuffle(arr: number[]): number[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function advanceQuestion(state: RoomState, customQuestions?: import('../../src/types').Question[]): RoomState {
  const nextIndex = state.currentQuestionIndex + 1
  const sourceQuestions = customQuestions ?? getQuizData()
  const count = Math.min(state.settings.questionCount, sourceQuestions.length)
  const order = state.questionOrder.length === count
    ? state.questionOrder
    : shuffle(sourceQuestions.map((_, i) => i)).slice(0, count)

  // 問題数終了 or 全員WIN/LOSEならfinished
  if (nextIndex >= order.length || checkGameEnd(state)) {
    return { ...state, phase: 'finished', currentQuestion: null, timerEndsAt: null, questionOrder: order }
  }
  const question = (customQuestions ?? getQuizData())[order[nextIndex]]
  const typewriterMs = question.text.length * TYPEWRITER_SPEED_MS
  return {
    ...state,
    phase: 'question',
    currentQuestionIndex: nextIndex,
    currentQuestion: question,
    questionStartedAt: Date.now(),
    buzzedPlayerId: null,
    buzzedPlayerName: null,
    lastJudgement: null,
    lastAnswerPlayerId: null,
    timerEndsAt: Date.now() + Q_DISPLAY_MS + typewriterMs + BUZZ_TIMEOUT_MS,
    questionOrder: order,
    totalQuestions: order.length,
  }
}

export function skipQuestion(state: RoomState): RoomState {
  // Freeze/m◯n休: 休み中プレイヤーのrestを消化
  const rule = getRuleDef(state.settings.ruleId)
  let players = state.players
  if (rule.hasSkip && rule.onSkip) {
    players = state.players.map(p => {
      if (p.status !== 'ACTIVE') return p
      const result = rule.onSkip!(p.ruleState, state.settings.ruleParams)
      if (result) return { ...p, ruleState: { ...p.ruleState } }
      return p
    })
  }
  return {
    ...state,
    players,
    phase: 'result',
    lastJudgement: 'skip',
    buzzedPlayerId: null,
    buzzedPlayerName: null,
    lastAnswerPlayerId: null,
    timerEndsAt: Date.now() + RESULT_SHOW_MS,
  }
}

export function acceptBuzz(state: RoomState, playerId: string): RoomState {
  const player = state.players.find((p) => p.id === playerId)
  if (!player) return state
  return {
    ...state,
    phase: 'answering',
    buzzedPlayerId: playerId,
    buzzedPlayerName: player.name,
    timerEndsAt: Date.now() + ANSWER_TIMEOUT_MS,
  }
}

function checkGameEnd(state: RoomState): boolean {
  const { winnerCount, loserCount } = state.settings
  const winners = state.players.filter(p => p.status === 'WIN').length
  const losers = state.players.filter(p => p.status === 'LOSE').length
  if (winnerCount > 0 && winners >= winnerCount) return true
  if (loserCount > 0 && losers >= loserCount) return true
  return false
}

export function applyAnswer(
  state: RoomState,
  playerId: string,
  rawAnswer: string
): { nextState: RoomState; correct: boolean } {
  if (state.buzzedPlayerId !== playerId) return { nextState: state, correct: false }

  const actual = normalizeAnswer(rawAnswer)
  const acceptedAnswers = state.currentQuestion?.answers ?? [state.currentQuestion?.answer ?? '']
  const correct = acceptedAnswers.some((a) => normalizeAnswer(a) === actual)

  const rule = getRuleDef(state.settings.ruleId)
  const players: Player[] = state.players.map((p) => {
    if (p.id !== playerId || p.status !== 'ACTIVE') return p
    const newRuleState = { ...p.ruleState }
    correct
      ? rule.onCorrect(newRuleState, state.settings.ruleParams)
      : rule.onWrong(newRuleState, state.settings.ruleParams)
    const newStatus = rule.getStatus(newRuleState, state.settings.ruleParams)
    // scoreはruleStateのscoreかcorrectカウントを反映
    const score = typeof newRuleState.score === 'number'
      ? newRuleState.score
      : typeof newRuleState.correct === 'number'
        ? newRuleState.correct as number
        : p.score
    return { ...p, ruleState: newRuleState, status: newStatus, score }
  })

  const nextState: RoomState = {
    ...state,
    phase: 'result',
    players,
    lastJudgement: correct ? 'correct' : 'incorrect',
    lastAnswerPlayerId: playerId,
    timerEndsAt: Date.now() + RESULT_SHOW_MS,
  }

  return { nextState, correct }
}

export function reassignHost(state: RoomState): RoomState {
  if (state.players.length === 0) return state
  const newHost = state.players[0]
  return {
    ...state,
    hostId: newHost.id,
    players: state.players.map((p) => ({ ...p, isHost: p.id === newHost.id })),
  }
}
