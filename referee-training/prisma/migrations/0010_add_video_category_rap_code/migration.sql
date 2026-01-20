-- Migration: Add rapCategoryCode to VideoCategory table
-- This field stores UEFA RAP category codes for video categorization

-- Add rapCategoryCode column
ALTER TABLE "VideoCategory" ADD COLUMN IF NOT EXISTS "rapCategoryCode" TEXT;

-- Add index for filtering by rapCategoryCode
CREATE INDEX IF NOT EXISTS "VideoCategory_rapCategoryCode_idx" ON "VideoCategory"("rapCategoryCode");

