-- Add missing fields to VideoClip to match Prisma schema
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OffsideReason') THEN
    CREATE TYPE "OffsideReason" AS ENUM (
      'INTERFERING_WITH_PLAY',
      'INTERFERING_WITH_OPPONENT',
      'GAINING_ADVANTAGE',
      'NOT_OFFSIDE'
    );
  END IF;
END $$;

ALTER TABLE "VideoClip" ADD COLUMN IF NOT EXISTS "isEducational" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "VideoClip" ADD COLUMN IF NOT EXISTS "playOn" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "VideoClip" ADD COLUMN IF NOT EXISTS "noOffence" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "VideoClip" ADD COLUMN IF NOT EXISTS "offsideReason" "OffsideReason";

