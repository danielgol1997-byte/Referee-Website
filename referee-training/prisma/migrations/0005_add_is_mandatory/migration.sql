-- Add isMandatory field to separate mandatory status from visibility
-- isActive: true/false (visible/hidden)
-- isMandatory: true/false (mandatory/pool when visible)

ALTER TABLE "MandatoryTest" ADD COLUMN "isMandatory" BOOLEAN NOT NULL DEFAULT true;

-- Update existing tests: if isActive was false, they were meant to be pool tests
-- So set isMandatory based on current isActive state
UPDATE "MandatoryTest" SET "isMandatory" = "isActive";

-- Now make all tests active by default (they were hidden because isActive=false meant pool)
-- We'll let users explicitly hide them with the active/inactive button
UPDATE "MandatoryTest" SET "isActive" = true WHERE "isActive" = false;
