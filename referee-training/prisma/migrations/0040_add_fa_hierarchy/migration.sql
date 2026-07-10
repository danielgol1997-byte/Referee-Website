-- Federation hierarchy: associations, ranks, and user assignments.

-- CreateTable
CREATE TABLE "Association" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countryCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Association_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rank" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "associationId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rank_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "associationId" TEXT,
ADD COLUMN     "rankId" TEXT,
ADD COLUMN     "internationalRankId" TEXT,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "heightCm" INTEGER,
ADD COLUMN     "weightKg" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Association_name_key" ON "Association"("name");

-- CreateIndex
CREATE INDEX "Rank_associationId_order_idx" ON "Rank"("associationId", "order");

-- CreateIndex
CREATE INDEX "User_associationId_idx" ON "User"("associationId");

-- CreateIndex
CREATE INDEX "User_rankId_idx" ON "User"("rankId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "Association"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_rankId_fkey" FOREIGN KEY ("rankId") REFERENCES "Rank"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_internationalRankId_fkey" FOREIGN KEY ("internationalRankId") REFERENCES "Rank"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rank" ADD CONSTRAINT "Rank_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "Association"("id") ON DELETE CASCADE ON UPDATE CASCADE;
