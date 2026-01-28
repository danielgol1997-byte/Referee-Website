-- AlterTable: Remove rapCategory field from Tag table
ALTER TABLE "Tag" DROP COLUMN IF EXISTS "rapCategory";

-- AlterTable: Remove rapCategoryCode field from VideoCategory table
ALTER TABLE "VideoCategory" DROP COLUMN IF EXISTS "rapCategoryCode";

-- DropIndex: Drop index on rapCategory in Tag table (if exists)
DROP INDEX IF EXISTS "Tag_rapCategory_idx";

-- DropIndex: Drop index on rapCategoryCode in VideoCategory table (if exists)
DROP INDEX IF EXISTS "VideoCategory_rapCategoryCode_idx";
