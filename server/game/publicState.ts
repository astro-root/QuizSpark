import type { Question, RoomState } from '../../src/types'
import { toPublicId } from './identity'

/**
 * クライアントへ送出してよい「公開状態」への変換。
 *
 * 1. 問題の答え(answer / answers / displayAnswer)は、結果表示フェーズ(result)になるまで送らない。
 *    許可リスト方式で組み立てるため、Question に将来フィールドが増えても、ここで明示しない限り漏れない。
 * 2. プレイヤーの秘密トークンは送らず、公開 ID(identity.ts)に置き換える。
 *    対象: players[].id / hostId / buzzedPlayerId / lastAnswerPlayerId
 *
 * 'room-update' を emit する箇所は、必ずこの関数を経由すること
 * (tests/publicState.test.ts がソースを走査して検査する)。
 */
export function toPublicQuestion(q: Question): Question {
  return { id: q.id, text: q.text, genre: q.genre, answer: '', answers: [], displayAnswer: '' }
}

const pub = (token: string | null): string | null => (token ? toPublicId(token) : null)

export function toPublicState(state: RoomState): RoomState {
  const question = !state.currentQuestion || state.phase === 'result'
    ? state.currentQuestion
    : toPublicQuestion(state.currentQuestion)
  return {
    ...state,
    hostId: toPublicId(state.hostId),
    buzzedPlayerId: pub(state.buzzedPlayerId),
    lastAnswerPlayerId: pub(state.lastAnswerPlayerId),
    players: state.players.map(p => ({ ...p, id: toPublicId(p.id) })),
    currentQuestion: question,
  }
}
