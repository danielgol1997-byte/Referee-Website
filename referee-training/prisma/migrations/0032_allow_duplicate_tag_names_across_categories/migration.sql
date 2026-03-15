-- Allow duplicate tag names across different categories.
-- Keep uniqueness within each category.
DROP INDEX IF EXISTS "Tag_name_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Tag_name_categoryId_key" ON "Tag"("name", "categoryId");
