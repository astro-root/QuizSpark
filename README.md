# QuizSpark ⚡

リアルタイム早押しクイズバトルアプリ。友達とルームを作って対戦するか、ランダムマッチで見知らぬ相手と戦おう。

---

## 🎮 機能

### ゲーム
- **早押しバトル** — Socket.io によるリアルタイム早押し判定
- **ルーム対戦** — ルームIDを共有して友達と対戦
- **ランダムマッチ** — レート差±200以内で自動マッチング（待機時間に応じて範囲拡大）
- **ゲームルール** — 5○2×形式など複数ルール対応
- **問題セット** — ユーザーが独自問題セットを作成・CSV管理可能

### ユーザー
- **レートシステム** — 勝利+30 / 敗北-20、下限0
- **段位** — ブロンズ / シルバー / ゴールド / プラチナ / ダイヤ / マスター
- **ランキング** — TOP10をレート順で表示
- **フォロー** — 他ユーザーをフォロー、フォロワー管理
- **アバター** — プロフィール画像のアップロード（最大2MB）
- **戦績** — 対戦履歴・勝率・正解数の記録

### その他
- **チャット** — ロビー・ゲーム中のリアルタイムチャット
- **問題投稿** — ユーザーが問題を投稿（管理者承認制）
- **ダーク/ライトテーマ** — 切り替え対応
- **モバイル最適化** — 早押しボタン固定、キーボード対応

---

## 🛠 技術スタック

| レイヤー | 技術 |
|--------|------|
| フロントエンド | React 18 + TypeScript + Vite |
| ルーティング | React Router v6 |
| バックエンド | Express + Socket.io |
| 認証 | Passport.js（Google OAuth2 + メール/パスワード） |
| ORM | Prisma |
| DB | PostgreSQL |
| ファイルアップロード | Multer |
| セッション | express-session + connect-pg-simple |

---

## 🚀 ローカルセットアップ

### 前提
- Node.js 18+
- PostgreSQL

### 手順

```bash
git clone https://github.com/your-username/QuizSpark.git
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
問題文,答え(ひらがな),表示用答え,ジャンル,別解1,別解2
日本の首都はどこですか？,とうきょう,東京,地理,tokyo
```

ジャンル：`文学` / `歴史` / `地理` / `公民` / `自然科学` / `言葉` / `芸能` / `スポーツ` / `漫アゲ` / `音楽` / `生活` / `ノンジャンル`

---

## 📁 ディレクトリ構成

```
QuizSpark/
├── src/                    # フロントエンド (React)
│   ├── pages/              # 各ページ
│   │   ├── HomePage.tsx
│   │   ├── GamePage.tsx
│   │   ├── LobbyPage.tsx
│   │   ├── MatchPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── RankingPage.tsx
│   │   ├── UserPage.tsx
│   │   ├── SubmitPage.tsx
│   │   ├── AdminPage.tsx
│   │   └── ContactPage.tsx
│   ├── components/         # 共通コンポーネント
│   │   ├── AppHeader.tsx
│   │   ├── BottomNav.tsx
│   │   ├── RoomChat.tsx
│   │   ├── MatchmakingModal.tsx
│   │   └── ConnectionBanner.tsx
│   ├── context/            # React Context
│   │   ├── AuthContext.tsx
│   │   ├── SocketContext.tsx
│   │   └── ThemeContext.tsx
│   └── types/
│       └── index.ts
├── server/                 # バックエンド (Express)
│   ├── auth/               # 認証
│   │   ├── router.ts
│   │   ├── passport.ts
│   │   └── local.ts
│   ├── game/               # ゲームロジック
│   │   ├── GameManager.ts
│   │   ├── MatchmakingManager.ts
│   │   ├── RoomState.ts
│   │   ├── RuleEngine.ts (rules.ts)
│   │   ├── quizData.ts
│   │   └── seed.ts
│   ├── routes/             # REST API
│   │   ├── admin.ts
│   │   ├── questions.ts
│   │   ├── questionSets.ts
│   │   ├── records.ts
│   │   ├── ranking.ts
│   │   ├── follow.ts
│   │   ├── rooms.ts
│   │   └── contact.ts
│   ├── socket/             # Socket.io
│   │   ├── index.ts
│   │   └── handlers.ts
│   ├── lib/
│   │   ├── prisma.ts
│   │   └── sessionMiddleware.ts
│   ├── app.ts
│   └── index.ts
└── prisma/
    └── schema.prisma
```
