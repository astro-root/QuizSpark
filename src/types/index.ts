export type Phase = 'lobby' | 'question' | 'answering' | 'result' | 'finished'

export type RuleId =
  | 'free' | 'mon' | 'newyork' | 'updown' | 'by'
  | 'freeze' | 'mon_rest' | 'swedish' | 'divide'
  | 'lucky' | 'rensei' | 'rengou' | 'combo'

export interface GameSettings {
  ruleId: RuleId
  ruleParams: Record<string, number>
  questionCount: number   // 1セットの問題数
  winnerCount: number     // 何人勝ち抜けで終了 (0=無制限)
  loserCount: number      // 何人失格で終了 (0=無制限)
  isPublic: boolean        // 公開ルーム
  questionSetId: string | null // 使用する問題セットID (nullは共有DB)
}

export type PlayerStatus = 'ACTIVE' | 'WIN' | 'LOSE'

export interface Player {
  id: string
  name: string
  score: number
  isHost: boolean
  status: PlayerStatus
  ruleState: Record<string, number | boolean | string>
}

export interface Question {
  id: number
  text: string
  answer: string
  answers?: string[]
  displayAnswer: string
  genre?: string
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
  lastJudgement: 'correct' | 'incorrect' | 'skip' | null
  lastAnswerPlayerId: string | null
  timerEndsAt: number | null
  totalQuestions: number
  questionOrder: number[]
  settings: GameSettings
  isMatchmaking?: boolean
  questionStartedAt?: number
}

export interface PublicRoom {
  id: string
  playerCount: number
  hostName: string
  ruleId: string
  questionCount: number
  phase?: string
}

export interface PrematchPlayer {
  id: string
  name: string
  avatarUrl: string | null
  rate: number
  titleId: string | null
  winStreak: number
}
export interface PrematchInfo {
  myPlayer: PrematchPlayer
  opponent: PrematchPlayer
  startsIn: number
}
export interface RateResult {
  result: 'WIN' | 'LOSE'
  oldRate: number
  newRate: number
  delta: number
}
export interface ServerToClientEvents {
  'room-update': (state: RoomState) => void
  'match-found': (roomId: string) => void
  'queue-status': (position: number) => void
  'chat-message': (playerId: string, playerName: string, text: string, ts: number) => void
  'buzz-accepted': (playerId: string, playerName: string) => void
  error: (message: string) => void
  'public-rooms': (rooms: PublicRoom[]) => void
  'prematch-info': (info: PrematchInfo) => void
  'rate-result': (result: RateResult) => void
  stamp: (data: { fromId: string; fromName: string; stamp: string }) => void
}

export interface MatchmakingEntry {
  playerId: string
  playerName: string
  ruleId: RuleId
  questionCount: number
}

export interface ClientToServerEvents {
  'create-room': (name: string, callback: (roomId: string) => void) => void
  'join-room': (roomId: string, name: string, callback: (error: string | null) => void) => void
  'update-settings': (settings: GameSettings) => void
  'reset-game': () => void
  'join-queue': () => void
  'leave-queue': () => void
  'send-chat': (text: string) => void
  'sync-state': (roomId: string) => void
  'start-game': () => void
  buzz: () => void
  'submit-answer': (answer: string) => void
  'send-stamp': (stamp: string) => void
}

export interface InterServerEvents {}

export interface SocketData {
  roomId: string
  playerId: string
  dbUserId?: string
}
