-- User拡張
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "username" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bio" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");

-- QuestionSet
CREATE TABLE IF NOT EXISTS "QuestionSet" (
  "id"          TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "isPublic"    BOOLEAN NOT NULL DEFAULT false,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuestionSet_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "QuestionSet" ADD CONSTRAINT "QuestionSet_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- QuestionSetItem
CREATE TABLE IF NOT EXISTS "QuestionSetItem" (
  "id"            SERIAL NOT NULL,
  "setId"         TEXT NOT NULL,
  "text"          TEXT NOT NULL,
  "answer"        TEXT NOT NULL,
  "answers"       TEXT[] NOT NULL DEFAULT '{}',
  "displayAnswer" TEXT NOT NULL,
  "order"         INT NOT NULL DEFAULT 0,
  CONSTRAINT "QuestionSetItem_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "QuestionSetItem" ADD CONSTRAINT "QuestionSetItem_setId_fkey"
  FOREIGN KEY ("setId") REFERENCES "QuestionSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- BattleRecord
CREATE TABLE IF NOT EXISTS "BattleRecord" (
  "id"          TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "roomId"      TEXT NOT NULL,
  "ruleId"      TEXT NOT NULL,
  "result"      TEXT NOT NULL,
  "correct"     INT NOT NULL DEFAULT 0,
  "wrong"       INT NOT NULL DEFAULT 0,
  "score"       INT NOT NULL DEFAULT 0,
  "playerCount" INT NOT NULL DEFAULT 0,
  "playedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BattleRecord_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "BattleRecord" ADD CONSTRAINT "BattleRecord_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
