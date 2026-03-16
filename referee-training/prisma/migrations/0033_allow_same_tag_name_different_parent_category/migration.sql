-- Allow same tag name within a categoryId as long as parentCategory differs.
-- Drop old unique constraint on (name, categoryId)
DROP INDEX IF EXISTS "Tag_name_categoryId_key";

-- Create new unique constraint on (name, categoryId, parentCategory)
CREATE UNIQUE INDEX "Tag_name_categoryId_parentCategory_key" ON "Tag"("name", "categoryId", "parentCategory");
