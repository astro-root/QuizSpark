# QuizSpark ⚡

リアルタイム早押しクイズバトルアプリ。フリーマッチで友達と、ランダムマッチで見知らぬ相手と、本格的なクイズ対戦を楽しもう。

---

## 🎮 機能

### ゲーム
- **早押しバトル** — Socket.io によるリアルタイム早押し判定
- **フリーマッチ** — ルームIDを共有して友達と対戦。公開ルームなら誰でも参加可能
- **ランダムマッチ** — レート差±200以内で自動マッチング（待機時間に応じて範囲拡大）
- **12種類のゲームルール** — 下記参照
- **問題セット** — 独自問題セットを作成・CSV管理可能。フリーマッチで使用
- **スタンプ機能** — 対戦中に絵文字スタンプを送り合える（👍👏🔥💪😲🤔😭🎉）
- **問題重複排除** — 公開問題プール使用時、両プレイヤーの直近20戦で出題された問題は出ない

### ゲームルール一覧

| ルール | 概要 |
|--------|------|
| m◯n× | m回正解で勝ち抜け、n回誤答で失格 |
| Free | 制限なし自由形式 |
| NewYork | 正解加点・誤答減点のポイント制 |
| Up-Down | 1回の誤答でポイントリセット |
| by | テクニカルな掛け算方式 |
| Freeze | 1問の誤答で通算誤答数分休み |
| m◯n休 | 誤答で一定問数休み |
| Swedish | ポイントが増えるにつれ誤答ペナルティが大きくなる |
| Divide | 1問の誤答でポイントを÷1,÷2,÷3,... |
| Lucky Shot | ランダム加点・減点 |
| 連答付き | 連続正解で+1pt |
| 連誤答付き | 連続誤答で2× |
| m hits Combo | コンボ式ポイント |

### ユーザー
- **レートシステム** — 勝利+30 / 敗北−20、下限0
- **段位** — ブロンズ / シルバー / ゴールド / プラチナ / ダイヤ / マスター
- **ランキング** — TOP10をレート順で表示
- **フォロー** — 他ユーザーをフォロー・フォロワー管理
- **アバター** — プロフィール画像のアップロード（最大2MB）
- **戦績** — 対戦履歴・勝率・正解数を記録
- **問題履歴** — 直近10問の出題・正誤・回答内容を確認。各問題への報告ボタン付き
- **ジャンル別レーダーチャート** — ジャンルごとの正答率をレーダーチャートで可視化
- **ダイレクトメッセージ** — ユーザー間のチャット機能

### 問題管理
- **問題投稿** — ユーザーが問題を投稿（管理者承認制）
- **問題報告フォーム** — 対戦中または問題履歴から誤りのある問題を報告（事実の誤り・誤字脱字・解答不正確・その他）
- **管理者API** — 報告一覧の確認・解決済みマーク

### その他
- **リアルタイムチャット** — ロビー・ゲーム中のチャット
- **通知** — フォロー・マッチなどのアプリ内通知
- **ダーク/ライトテーマ** — 切り替え対応
- **モバイル最適化** — スマホ・PC両対応レイアウト

---

## 🛠 技術スタック

| レイヤー | 技術 |
|--------|------|
| フロントエンド | React 18 + TypeScript + Vite |
| ルーティング | React Router v6 |
| バックエンド | Express + Socket.io |
| 認証 | Passport.js（Google OAuth2 + メール/パスワード） |
| ORM | Prisma |
| DB | PostgreSQL (Supabase) |
| ファイルアップロード | Multer |
| セッション | express-session + connect-pg-simple |
| フロントホスティング | Cloudflare Pages |
| バックエンドホスティング | Render |

---

## 🚀 ローカルセットアップ

### 前提
- Node.js 18+
- PostgreSQL

### 手順

```bash
git clone https://github.com/astro-root/QuizSpark.git
cd QuizSpark
npm install
```

`.env` を作成：

```env
DATABASE_URL=postgresql://user:password@localhost:5432/quizspark_db
SESSION_SECRET=your-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
NODE_ENV=development
```

```bash
npx prisma db push
npx prisma generate
npm run dev
```

---

## 📋 CSVフォーマット（問題インポート）

管理画面・問題セットのCSVインポートに使用するフォーマット：

```
問題文,答え(ひらがな),表示用答え,ジャンル,別解1,別解2,...
日本の首都はどこですか？,とうきょう,東京,地理,tokyo
```

**対応ジャンル：**
`文学` / `歴史` / `地理` / `公民` / `自然科学` / `言葉` / `芸能` / `スポーツ` / `漫アゲ` / `音楽` / `生活` / `ノンジャンル`

---

## 📁 ディレクトリ構成

```
QuizSpark/
├── src/                        # フロントエンド (React)
│   ├── pages/                  # 各ページ
│   │   ├── HomePage.tsx
│   │   ├── GamePage.tsx
│   │   ├── LobbyPage.tsx
│   │   ├── FreeLobbyPage.tsx
│   │   ├── MatchPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── RankingPage.tsx
│   │   ├── UserPage.tsx
│   │   ├── SubmitPage.tsx
│   │   ├── AdminPage.tsx
│   │   ├── ChatPage.tsx
│   │   └── ContactPage.tsx
│   ├── components/             # 共通コンポーネント
│   │   ├── AppHeader.tsx
│   │   ├── BottomNav.tsx
│   │   ├── PCNav.tsx
│   │   ├── RoomChat.tsx
│   │   ├── MatchmakingModal.tsx
│   │   ├── ConnectionBanner.tsx
│   │   ├── QuestionReportModal.tsx
│   │   └── profile/
│   │       ├── ProfileTab.tsx
│   │       ├── RecordsTab.tsx
│   │       ├── SetsTab.tsx
│   │       ├── QuestionHistoryTab.tsx
│   │       ├── TitleSelectTab.tsx
│   │       └── GenreRadarTab.tsx
│   ├── context/                # React Context
│   │   ├── AuthContext.tsx
│   │   ├── SocketContext.tsx
│   │   └── ThemeContext.tsx
│   ├── hooks/
│   │   ├── useSocket.ts
│   │   └── useMediaQuery.ts
│   └── types/
│       └── index.ts
├── server/                     # バックエンド (Express)
│   ├── auth/                   # 認証
│   ├── game/                   # ゲームロジック
│   │   ├── GameManager.ts
│   │   ├── MatchmakingManager.ts
│   │   ├── RoomState.ts
│   │   ├── quizData.ts
│   │   └── rules/
│   ├── routes/                 # REST API
│   │   ├── admin.ts
│   │   ├── questions.ts
│   │   ├── questionSets.ts
│   │   ├── questionHistory.ts
│   │   ├── reports.ts
│   │   ├── records.ts
│   │   ├── ranking.ts
│   │   ├── follow.ts
│   │   ├── rooms.ts
│   │   ├── messages.ts
│   │   ├── notifications.ts
│   │   ├── search.ts
│   │   └── contact.ts
│   ├── socket/
│   ├── lib/
│   ├── app.ts
│   └── index.ts
└── prisma/
    └── schema.prisma
```

---

## 🗄 主なデータモデル

| モデル | 説明 |
|--------|------|
| User | ユーザー情報・レート・段位 |
| Question | 問題文・答え・ジャンル |
| QuestionSet / QuestionSetItem | ユーザー作成の問題セット |
| QuestionHistory | 対戦履歴（ジャンル・問題ID含む） |
| QuestionReport | 問題への報告 |
| BattleRecord | 対戦成績 |
| Follow | フォロー関係 |
| DirectMessage | ダイレクトメッセージ |
| Notification | 通知 |

---

## 🔌 主要 Socket.io イベント

### クライアント → サーバー

| イベント | 説明 |
|--------|------|
| `create-room` | ルーム作成 |
| `join-room` | ルーム参加 |
| `start-game` | ゲーム開始 |
| `buzz` | 早押し |
| `submit-answer` | 回答送信 |
| `send-stamp` | スタンプ送信 |
| `send-chat` | チャット送信 |
| `join-queue` | マッチングキュー参加 |
| `leave-queue` | マッチングキュー離脱 |

### サーバー → クライアント

| イベント | 説明 |
|--------|------|
| `room-update` | ルーム状態の同期 |
| `buzz-accepted` | 早押し受付通知 |
| `stamp` | スタンプ受信 |
| `chat-message` | チャット受信 |
| `match-found` | マッチング成立 |
| `rate-result` | レート変動結果 |

---

## 📝 ライセンス

MIT
