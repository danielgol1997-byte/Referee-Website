-- Add federation scope (associationId) to content models. Null = global.

-- AlterTable
ALTER TABLE "VideoClip" ADD COLUMN "associationId" TEXT;

-- AlterTable
ALTER TABLE "Question" ADD COLUMN "associationId" TEXT;

-- AlterTable
ALTER TABLE "MandatoryTest" ADD COLUMN "associationId" TEXT;

-- AlterTable
ALTER TABLE "VideoTest" ADD COLUMN "associationId" TEXT;

-- CreateIndex
CREATE INDEX "VideoClip_associationId_idx" ON "VideoClip"("associationId");

-- CreateIndex
CREATE INDEX "Question_associationId_idx" ON "Question"("associationId");

-- CreateIndex
CREATE INDEX "MandatoryTest_associationId_idx" ON "MandatoryTest"("associationId");

-- CreateIndex
CREATE INDEX "VideoTest_associationId_idx" ON "VideoTest"("associationId");

-- AddForeignKey
ALTER TABLE "VideoClip" ADD CONSTRAINT "VideoClip_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "Association"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "Association"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MandatoryTest" ADD CONSTRAINT "MandatoryTest_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "Association"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoTest" ADD CONSTRAINT "VideoTest_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "Association"("id") ON DELETE SET NULL ON UPDATE CASCADE;
