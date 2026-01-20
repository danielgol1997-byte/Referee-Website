-- Migration: Add parentCategory and rapCategory to Tag table
-- These fields support the new tag organization system

-- Add parentCategory column (for CRITERIA tags)
ALTER TABLE "Tag" ADD COLUMN IF NOT EXISTS "parentCategory" TEXT;

-- Add rapCategory column (for CATEGORY tags)
ALTER TABLE "Tag" ADD COLUMN IF NOT EXISTS "rapCategory" TEXT;

-- Add index for filtering by category and parentCategory
CREATE INDEX IF NOT EXISTS "Tag_category_parentCategory_idx" ON "Tag"("category", "parentCategory");

-- Add index for filtering by rapCategory
CREATE INDEX IF NOT EXISTS "Tag_rapCategory_idx" ON "Tag"("rapCategory");

