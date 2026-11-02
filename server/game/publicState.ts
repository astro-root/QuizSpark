import type { Question, RoomState } from '../../src/types'

/**
 * クライアントへ送出してよい「公開状態」への変換。
 *
 * 問題の答え(answer / answers / displayAnswer)は、結果表示フェーズ(result)に
 * なるまでクライアントへ送らない。許可リスト方式で組み立てるため、Question に
 * 将来フィールドが増えても、ここで明示しない限り漏れない。
 *
 * 'room-update' を emit する箇所は、必ずこの関数を経由すること
 * (tests/publicState.test.ts がソースを走査して検査する)。
 */
export function toPublicQuestion(q: Question): Question {
  return { id: q.id, text: q.text, genre: q.genre, answer: '', answers: [], displayAnswer: '' }
}

export function toPublicState(state: RoomState): RoomState {
  if (!state.currentQuestion) return state
  if (state.phase === 'result') return state
  return { ...state, currentQuestion: toPublicQuestion(state.currentQuestion) }
}
