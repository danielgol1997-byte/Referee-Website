-- AlterTable
-- Step 1: Add new lawNumbers array column
ALTER TABLE "Question" ADD COLUMN "lawNumbers" INTEGER[];

-- Step 2: Migrate existing data from lawNumber to lawNumbers
-- For questions with a lawNumber, create a single-element array
UPDATE "Question" 
SET "lawNumbers" = ARRAY["lawNumber"] 
WHERE "lawNumber" IS NOT NULL;

-- Step 3: Set lawNumbers to empty array for questions without a lawNumber
UPDATE "Question" 
SET "lawNumbers" = ARRAY[]::INTEGER[] 
WHERE "lawNumber" IS NULL;

-- Step 4: Make lawNumbers NOT NULL with default empty array
ALTER TABLE "Question" ALTER COLUMN "lawNumbers" SET NOT NULL;
ALTER TABLE "Question" ALTER COLUMN "lawNumbers" SET DEFAULT '{}';

-- Step 5: Drop the old lawNumber column
ALTER TABLE "Question" DROP COLUMN "lawNumber";
