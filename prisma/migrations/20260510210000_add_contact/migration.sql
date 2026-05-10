CREATE TABLE IF NOT EXISTS "Contact" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT,
  "email"     TEXT NOT NULL,
  "category"  TEXT NOT NULL,
  "body"      TEXT NOT NULL,
  "status"    TEXT NOT NULL DEFAULT 'open',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);
