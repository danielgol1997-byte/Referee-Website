-- Create enum for QuestionSource
CREATE TYPE "QuestionSource" AS ENUM ('IFAB_ONLY', 'CUSTOM_ONLY', 'BOTH');

-- Add questionSource column with default value
ALTER TABLE "MandatoryTest" ADD COLUMN "questionSource" "QuestionSource" NOT NULL DEFAULT 'IFAB_ONLY';

-- Migrate existing data: 
-- If includeCustom is true, set to BOTH
-- If includeCustom is false, set to IFAB_ONLY
UPDATE "MandatoryTest" 
SET "questionSource" = CASE 
  WHEN "includeCustom" = true THEN 'BOTH'::"QuestionSource"
  ELSE 'IFAB_ONLY'::"QuestionSource"
END;

-- Drop the old includeCustom column
ALTER TABLE "MandatoryTest" DROP COLUMN "includeCustom";
