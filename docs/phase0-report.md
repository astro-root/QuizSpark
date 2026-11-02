# Phase 0 変更レポート

## 修正した問題
| 優先度 | 内容 | 主な変更 | テスト |
|---|---|---|---|
| P0 | 正解が WebSocket(`room-update`)で全員に配信 | `server/game/publicState.ts`(許可リスト方式)。GameManager 経路・タイマー経路を含む全送出を経由。`displayAnswer` も隠す | `tests/publicState.test.ts`(ソース走査の回帰ガード含む) |
| P1 | 投稿問題が承認なしで公開 | `POST /api/questions` は常に `approved:false` | `tests/validation.test.ts` |
| P1 | `GET /api/questions` が未認証で正解付き全件を返す | `requireAdmin` | 同上 |
| P1(新規) | 問題セット項目の削除で他人の項目を削除可能(IDOR) | `deleteMany({id, setId})` | 同上 |
| P1 | 切断者の戦績・レートが処理されない/終了処理の二重実行 | `settlement.ts` / `settleGame.ts` / GameManager の userId 保持と終了通知 1 回化 | `tests/settlement.test.ts`(実 GameManager + 偽タイマー) |
| P2 | CSRF・Origin、レート制限、Socket 入力検証(非文字列の回答や null 設定でプロセスが落ち得た)、`sync-state` による他室購読 | `origin.ts` `eventLimiter.ts` `settings.ts` ほか | `tests/hardening.test.ts` |

## 挙動が変わる点(仕様判断を含む。意図と違えば指示してください)
1. ランダムマッチ(1対1)で、片方だけ勝敗が確定して終了した場合、残った側を反対の結果にする(相手が失格→WIN、相手が勝ち抜け→LOSE)。従来は相手側の結果が ACTIVE のままでレート変動が片側だけだった。
2. ランダムマッチで両者未確定なら得点で WIN/LOSE を決める。**同点は引き分け(レート変動なし)**。従来は同点でも片方が WIN になり得た。
3. `GET /api/questions` は管理者のみ。クライアントからの呼び出しは確認できなかった(`/api/admin/*` は別経路)。
4. 問題セット項目の追加はジャンル等の既存仕様を維持。別解は最大10件・各100文字。
5. 参加者でないクライアントは `sync-state` でルームを購読できない。
6. OAuth に `state` を付与(ログイン CSRF 対策)。ログインに問題が出た場合は `state: true` を外せば元に戻る。

## 既に公開されている投稿問題の確認(読み取り専用 SQL。Supabase の SQL Editor で実行)
承認制が機能していなかった期間に投稿された問題は、すでに出題プールに入っています。
```sql
SELECT id, text, answer, "authorId", "createdAt"
FROM "Question"
WHERE "authorId" IS NOT NULL AND approved = true
ORDER BY "createdAt" DESC;
```
問題があるものは管理画面で非承認にするか、内容を確認してください(このコミットはデータを一切変更しません)。

## 未対応・次に対応する重要事項
- ~~**P1: プレイヤーの秘密トークンが公開 ID として配信されている**~~ → Phase 1 で修正済み(`server/game/identity.ts`、`identity` イベント)。元の説明:(`players[].id` / `hostId` = localStorage の `quizspark_player_token`)。同室のプレイヤーが他人のトークンを知り、なりすませる。公開 ID と秘密トークンの分離が必要(Phase 1 の最初に実施)。
- レート制限は express-rate-limit のメモリストア(プロセス単位)。Vercel(サーバーレス)では実効性が落ちるため Phase 2 で見直す。
- `export.csv` は答え列のカンマ未エスケープ・表計算ソフトの数式注入が未対策(P3)。
