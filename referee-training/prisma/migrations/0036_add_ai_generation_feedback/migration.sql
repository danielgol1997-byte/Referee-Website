-- CreateTable: AiGenerationFeedback
-- Stores admin feedback on AI-generated search descriptions so that
-- hallucinations, embellishments, and translation errors can be tracked
-- and used to iteratively improve the system prompt.

CREATE TABLE "AiGenerationFeedback" (
  "id"            TEXT NOT NULL,
  "videoId"       TEXT NOT NULL,
  "videoTitle"    TEXT,
  "rawInput"      TEXT NOT NULL,
  "existingTags"  TEXT,
  "aiOutput"      TEXT NOT NULL,
  "rating"        INTEGER NOT NULL,
  "issueType"     TEXT,
  "note"          TEXT,
  "createdById"   TEXT NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AiGenerationFeedback_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "AiGenerationFeedback"
  ADD CONSTRAINT "AiGenerationFeedback_videoId_fkey"
  FOREIGN KEY ("videoId") REFERENCES "VideoClip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiGenerationFeedback"
  ADD CONSTRAINT "AiGenerationFeedback_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "AiGenerationFeedback_videoId_idx"    ON "AiGenerationFeedback"("videoId");
CREATE INDEX "AiGenerationFeedback_createdById_idx" ON "AiGenerationFeedback"("createdById");
CREATE INDEX "AiGenerationFeedback_createdAt_idx"  ON "AiGenerationFeedback"("createdAt");
