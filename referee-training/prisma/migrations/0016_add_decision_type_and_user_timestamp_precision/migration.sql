-- Align timestamp precision with Prisma schema
ALTER TABLE "TagCategory" ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "User"
  ALTER COLUMN "disabledAt" SET DATA TYPE TIMESTAMP(3),
  ALTER COLUMN "lastLoginAt" SET DATA TYPE TIMESTAMP(3);

-- Create DecisionType table (used by tag system UI)
CREATE TABLE IF NOT EXISTS "DecisionType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DecisionType_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DecisionType_name_key" ON "DecisionType"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "DecisionType_slug_key" ON "DecisionType"("slug");
CREATE INDEX IF NOT EXISTS "DecisionType_isActive_order_idx" ON "DecisionType"("isActive", "order");
