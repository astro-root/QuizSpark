import type { Phase, Player, Question, RoomState } from '../../src/types'
import { quizData } from './quizData'

export function createRoom(roomId: string, hostId: string, hostName: string): RoomState {
  return {
    id: roomId,
    hostId,
    players: [
      {
        id: hostId,
        name: hostName,
        score: 0,
        isHost: true,
      },
    ],
    phase: 'lobby',
    currentQuestionIndex: -1,
    currentQuestion: null,
    buzzedPlayerId: null,
    buzzedPlayerName: null,
    lastJudgement: null,
    totalQuestions: quizData.length,
  }
}

export function addPlayer(state: RoomState, playerId: string, playerName: string): RoomState {
  const already = state.players.find((p) => p.id === playerId)
  if (already) return state
  return {
    ...state,
    players: [
      ...state.players,
      { id: playerId, name: playerName, score: 0, isHost: false },
    ],
  }
}

export function removePlayer(state: RoomState, playerId: string): RoomState {
  return {
    ...state,
    players: state.players.filter((p) => p.id !== playerId),
  }
}

export function startGame(state: RoomState): RoomState {
  return advanceQuestion({ ...state, currentQuestionIndex: -1 })
}

export function advanceQuestion(state: RoomState): RoomState {
  const nextIndex = state.currentQuestionIndex + 1
  if (nextIndex >= quizData.length) {
    return setPhase({ ...state, currentQuestion: null }, 'finished')
  }
  return {
    ...state,
    phase: 'question',
    currentQuestionIndex: nextIndex,
    currentQuestion: quizData[nextIndex],
    buzzedPlayerId: null,
    buzzedPlayerName: null,
    lastJudgement: null,
  }
}

export function acceptBuzz(state: RoomState, playerId: string): RoomState {
  const player = state.players.find((p) => p.id === playerId)
  if (!player) return state
  return {
    ...state,
    phase: 'judging',
    buzzedPlayerId: playerId,
    buzzedPlayerName: player.name,
  }
}

export function applyJudgement(state: RoomState, correct: boolean): RoomState {
  if (!state.buzzedPlayerId) return state
  const players = state.players.map((p) => {
    if (p.id !== state.buzzedPlayerId) return p
    return { ...p, score: correct ? p.score + 1 : p.score }
  })
  return {
    ...state,
    phase: correct ? 'result' : 'question',
    players,
    lastJudgement: correct ? 'correct' : 'incorrect',
    buzzedPlayerId: correct ? state.buzzedPlayerId : null,
    buzzedPlayerName: correct ? state.buzzedPlayerName : null,
  }
}

export function setPhase(state: RoomState, phase: Phase): RoomState {
  return { ...state, phase }
}

export function getPublicQuestion(question: Question | null): Question | null {
  if (!question) return null
  return { id: question.id, text: question.text, answer: question.answer }
}
