-- AlterTable: Add color field to TagCategory table
ALTER TABLE "TagCategory" ADD COLUMN IF NOT EXISTS "color" TEXT;
