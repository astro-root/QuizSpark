import type { Phase, Player, RoomState } from '../../src/types'
import { quizData } from './quizData'

export const BUZZ_TIMEOUT_MS = 5000
export const ANSWER_TIMEOUT_MS = 8000
export const RESULT_SHOW_MS = 2000

export function normalizeAnswer(input: string): string {
  let s = input
  s = s.replace(/[\u30A1-\u30F6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
  s = s.replace(/[^\u3041-\u3096]/g, '')
  return s
}

export function createRoom(roomId: string, hostId: string, hostName: string): RoomState {
  return {
    id: roomId,
    hostId,
    players: [{ id: hostId, name: hostName, score: 0, isHost: true }],
    phase: 'lobby',
    currentQuestionIndex: -1,
    currentQuestion: null,
    buzzedPlayerId: null,
    buzzedPlayerName: null,
    lastJudgement: null,
    timerEndsAt: null,
    totalQuestions: quizData.length,
  }
}

export function addPlayer(state: RoomState, playerId: string, playerName: string): RoomState {
  if (state.players.find((p) => p.id === playerId)) return state
  return {
    ...state,
    players: [...state.players, { id: playerId, name: playerName, score: 0, isHost: false }],
  }
}

export function removePlayer(state: RoomState, playerId: string): RoomState {
  return { ...state, players: state.players.filter((p) => p.id !== playerId) }
}

export function advanceQuestion(state: RoomState): RoomState {
  const nextIndex = state.currentQuestionIndex + 1
  if (nextIndex >= quizData.length) {
    return { ...state, phase: 'finished', currentQuestion: null, timerEndsAt: null }
  }
  return {
    ...state,
    phase: 'question',
    currentQuestionIndex: nextIndex,
    currentQuestion: quizData[nextIndex],
    buzzedPlayerId: null,
    buzzedPlayerName: null,
    lastJudgement: null,
    timerEndsAt: Date.now() + BUZZ_TIMEOUT_MS,
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

export function applyAnswer(
  state: RoomState,
  playerId: string,
  rawAnswer: string
): { nextState: RoomState; correct: boolean } {
  if (state.buzzedPlayerId !== playerId) return { nextState: state, correct: false }

  const expected = normalizeAnswer(state.currentQuestion?.answer ?? '')
  const actual = normalizeAnswer(rawAnswer)
  const correct = actual === expected

  const players: Player[] = state.players.map((p) =>
    p.id === playerId ? { ...p, score: correct ? p.score + 1 : p.score } : p
  )

  const nextState: RoomState = {
    ...state,
    phase: 'result',
    players,
    lastJudgement: correct ? 'correct' : 'incorrect',
    timerEndsAt: Date.now() + RESULT_SHOW_MS,
  }

  return { nextState, correct }
}

export function setPhase(state: RoomState, phase: Phase): RoomState {
  return { ...state, phase }
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
