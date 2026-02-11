-- AlterTable
ALTER TABLE "VideoTest" ADD COLUMN IF NOT EXISTS "maxViewsPerClip" INTEGER;

-- AlterTable
ALTER TABLE "VideoTestSession"
ADD COLUMN IF NOT EXISTS "maxViewsPerClip" INTEGER,
ADD COLUMN IF NOT EXISTS "clipViewCounts" JSONB;
