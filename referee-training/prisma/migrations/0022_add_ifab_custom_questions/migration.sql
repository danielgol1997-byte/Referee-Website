-- Add isIfab field to Question table
-- Default to true as all existing questions are IFAB official questions
ALTER TABLE "Question" ADD COLUMN "isIfab" BOOLEAN NOT NULL DEFAULT true;

-- Add includeCustom field to MandatoryTest table
-- Default to false to maintain existing behavior (IFAB only)
ALTER TABLE "MandatoryTest" ADD COLUMN "includeCustom" BOOLEAN NOT NULL DEFAULT false;

-- Add index for efficient filtering by IFAB status
CREATE INDEX "Question_isIfab_isActive_idx" ON "Question"("isIfab", "isActive");

-- Update all existing questions to IFAB (true)
UPDATE "Question" SET "isIfab" = true;

-- Update all existing tests to not include custom questions
UPDATE "MandatoryTest" SET "includeCustom" = false;
