import type { Question, RoomState } from '../../src/types'
import { toPublicQuestion } from './publicState'

/**
 * サーバーだけが持つ秘密情報。クライアントへ配信する状態(RoomState)とは別に保持する。
 *  - question     : 現在の問題(答え・別解を含む完全版)
 *  - questionOrder: 出題順(今後出る問題の ID 列)
 *
 * 将来 Firebase RTDB へ移す際も「公開ノード」と「サーバー専用の秘密ノード」にそのまま対応する。
 */
export interface RoomSecret {
  question: Question | null
  questionOrder: number[]
}

export const emptySecret = (): RoomSecret => ({ question: null, questionOrder: [] })

/**
 * 完全な状態(秘密を含む)を、保存用の「公開状態」と「秘密」に分ける。
 * 公開状態の問題は、結果表示(result)・終了(finished)以外では答えを持たない。
 * これにより、保存されている公開状態をどこへ出しても答えは漏れない。
 */
export function splitState(full: RoomState): { pub: RoomState; secret: RoomSecret } {
  const q = full.currentQuestion
  const reveal = full.phase === 'result' || full.phase === 'finished'
  return {
    pub: { ...full, currentQuestion: q ? (reveal ? q : toPublicQuestion(q)) : null, questionOrder: [] },
    secret: { question: q, questionOrder: full.questionOrder },
  }
}

/** 公開状態と秘密を合わせて、ゲームロジック(RoomState.ts の純粋関数)に渡す完全な状態に戻す。 */
export function joinState(pub: RoomState, secret: RoomSecret | undefined): RoomState {
  if (!secret) return pub
  return { ...pub, currentQuestion: secret.question, questionOrder: secret.questionOrder }
}
