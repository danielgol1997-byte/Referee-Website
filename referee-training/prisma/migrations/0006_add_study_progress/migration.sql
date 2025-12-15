-- CreateTable
CREATE TABLE "StudyProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudyProgress_userId_isRead_idx" ON "StudyProgress"("userId", "isRead");

-- CreateIndex
CREATE UNIQUE INDEX "StudyProgress_userId_questionId_key" ON "StudyProgress"("userId", "questionId");

