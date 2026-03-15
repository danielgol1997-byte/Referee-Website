-- Add per-tag usage scope flags.
-- Defaults keep current behavior (usable in both library and tests).
ALTER TABLE "Tag"
ADD COLUMN "useInVideoLibrary" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "useInVideoTests" BOOLEAN NOT NULL DEFAULT true;
