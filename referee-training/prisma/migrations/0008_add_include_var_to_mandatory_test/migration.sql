-- Add includeVar field to MandatoryTest
ALTER TABLE "MandatoryTest" ADD COLUMN "includeVar" BOOLEAN NOT NULL DEFAULT false;
