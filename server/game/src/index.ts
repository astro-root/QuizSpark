export type Phase = 'lobby' | 'question' | 'buzzing' | 'judging' | 'result' | 'finished'

export interface Player {
  id: string
  name: string
  score: number
  isHost: boolean
}

export interface Question {
  id: number
  text: string
  answer: string
}

export interface RoomState {
  id: string
  hostId: string
  players: Player[]
  phase: Phase
  currentQuestionIndex: number
  currentQuestion: Question | null
  buzzedPlayerId: string | null
  buzzedPlayerName: string | null
  lastJudgement: 'correct' | 'incorrect' | null
  totalQuestions: number
}

export interface ServerToClientEvents {
  'room-update': (state: RoomState) => void
  'buzz-accepted': (playerId: string, playerName: string) => void
  error: (message: string) => void
}

export interface ClientToServerEvents {
  'create-room': (name: string, callback: (roomId: string) => void) => void
  'join-room': (roomId: string, name: string, callback: (error: string | null) => void) => void
  'start-game': () => void
  buzz: () => void
  judge: (correct: boolean) => void
  'next-question': () => void
}

export interface InterServerEvents {}

export interface SocketData {
  roomId: string
  playerId: string
}
