-- Add DEVELOPER value to the Role enum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'DEVELOPER';

-- Create SearchQueryLog table
CREATE TABLE "SearchQueryLog" (
  "id"                 TEXT NOT NULL,
  "userId"             TEXT NOT NULL,
  "rawQuery"           TEXT NOT NULL,
  "expandedQuery"      TEXT,
  "detectedLanguage"   TEXT,
  "inferredTags"       JSONB,
  "selectedTagFilters" TEXT[] NOT NULL DEFAULT '{}',
  "resultVideoIds"     TEXT[] NOT NULL DEFAULT '{}',
  "resultCount"        INTEGER NOT NULL DEFAULT 0,
  "searchMethod"       TEXT NOT NULL DEFAULT 'keyword',
  "durationMs"         INTEGER,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SearchQueryLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SearchQueryLog"
  ADD CONSTRAINT "SearchQueryLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "SearchQueryLog_userId_idx"    ON "SearchQueryLog"("userId");
CREATE INDEX "SearchQueryLog_createdAt_idx" ON "SearchQueryLog"("createdAt");

-- Create DeveloperSettings singleton table
CREATE TABLE "DeveloperSettings" (
  "id"                   TEXT NOT NULL DEFAULT 'default',
  "searchLoggingEnabled" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DeveloperSettings_pkey" PRIMARY KEY ("id")
);

-- Seed the singleton row
INSERT INTO "DeveloperSettings" ("id", "searchLoggingEnabled", "updatedAt")
VALUES ('default', true, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
