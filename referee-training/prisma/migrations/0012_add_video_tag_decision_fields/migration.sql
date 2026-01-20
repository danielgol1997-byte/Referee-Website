-- Add missing fields to VideoTag to match Prisma schema
ALTER TABLE "VideoTag" ADD COLUMN IF NOT EXISTS "isCorrectDecision" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "VideoTag" ADD COLUMN IF NOT EXISTS "decisionOrder" INTEGER NOT NULL DEFAULT 0;

