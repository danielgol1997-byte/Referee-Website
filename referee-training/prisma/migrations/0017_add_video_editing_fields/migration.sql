-- Add video editing metadata fields to VideoClip table
ALTER TABLE "VideoClip" ADD COLUMN "trimStart" DOUBLE PRECISION;
ALTER TABLE "VideoClip" ADD COLUMN "trimEnd" DOUBLE PRECISION;
ALTER TABLE "VideoClip" ADD COLUMN "cutSegments" JSONB;
ALTER TABLE "VideoClip" ADD COLUMN "loopZoneStart" DOUBLE PRECISION;
ALTER TABLE "VideoClip" ADD COLUMN "loopZoneEnd" DOUBLE PRECISION;
