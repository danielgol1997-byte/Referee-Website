-- Add new boolean fields
ALTER TABLE "MandatoryTest" ADD COLUMN "includeIfab" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "MandatoryTest" ADD COLUMN "includeCustom" BOOLEAN NOT NULL DEFAULT false;

-- Migrate existing data from questionSource enum
UPDATE "MandatoryTest" 
SET 
  "includeIfab" = CASE 
    WHEN "questionSource" = 'IFAB_ONLY' THEN true
    WHEN "questionSource" = 'CUSTOM_ONLY' THEN false
    WHEN "questionSource" = 'BOTH' THEN true
    ELSE true
  END,
  "includeCustom" = CASE 
    WHEN "questionSource" = 'IFAB_ONLY' THEN false
    WHEN "questionSource" = 'CUSTOM_ONLY' THEN true
    WHEN "questionSource" = 'BOTH' THEN true
    ELSE false
  END;

-- Drop the old questionSource column
ALTER TABLE "MandatoryTest" DROP COLUMN "questionSource";

-- Drop the enum type
DROP TYPE "QuestionSource";
