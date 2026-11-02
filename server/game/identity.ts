import { createHmac, randomBytes } from 'node:crypto'

/**
 * プレイヤーの「秘密トークン」と「公開 ID」の分離。
 *
 * 秘密トークン: クライアントが localStorage に持ち、接続時の認証に使う。サーバー外へ出さない。
 * 公開 ID     : 他のプレイヤーへ配信してよい識別子。HMAC(秘密鍵, トークン) から導出する。
 *               - 逆算できない(トークンを知る手がかりにならない)
 *               - ステートレス(対応表を持たないので、複数インスタンスでも秘密鍵が同じなら一致する)
 *
 * 秘密鍵は PLAYER_ID_SECRET、無ければ SESSION_SECRET を使う。どちらも無い場合(テスト・ローカル)は
 * プロセスごとのランダム値になり、再起動すると公開 ID が変わる(クライアントは接続時に再取得する)。
 */
let secret: string | Buffer = process.env.PLAYER_ID_SECRET || process.env.SESSION_SECRET || randomBytes(32)

/** テスト用。 */
export function setIdentitySecret(s: string) { secret = s }

export function toPublicId(token: string): string {
  return createHmac('sha256', secret).update('quizspark:player-id:' + token).digest('base64url').slice(0, 16)
}
