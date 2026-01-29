-- Add isUpToDate field to Question table
-- Default to false as all existing questions need verification

ALTER TABLE "Question" ADD COLUMN "isUpToDate" BOOLEAN NOT NULL DEFAULT false;

-- Add index for efficient filtering
CREATE INDEX "Question_isUpToDate_isActive_idx" ON "Question"("isUpToDate", "isActive");

-- Update all existing questions to NOT up to date (requires verification)
UPDATE "Question" SET "isUpToDate" = false;
