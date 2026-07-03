-- CreateEnum
CREATE TYPE "ArDecision" AS ENUM ('OFFSIDE', 'ONSIDE');

-- CreateTable
CREATE TABLE "ArClip" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "duration" DOUBLE PRECISION,
    "correctAnswer" "ArDecision" NOT NULL,
    "passMomentTime" DOUBLE PRECISION,
    "passFrameUrl" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArClip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArTestSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clipIds" TEXT[],
    "totalClips" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER,
    "completedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "totalAnswerTimeMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArTestSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArTestAnswer" (
    "id" TEXT NOT NULL,
    "arTestSessionId" TEXT NOT NULL,
    "arClipId" TEXT NOT NULL,
    "userAnswer" "ArDecision" NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "timeToAnswerMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArTestAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArClip_isActive_createdAt_idx" ON "ArClip"("isActive", "createdAt");

-- CreateIndex
CREATE INDEX "ArTestSession_userId_createdAt_idx" ON "ArTestSession"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ArTestAnswer_arTestSessionId_arClipId_key" ON "ArTestAnswer"("arTestSessionId", "arClipId");

-- CreateIndex
CREATE INDEX "ArTestAnswer_arTestSessionId_idx" ON "ArTestAnswer"("arTestSessionId");

-- CreateIndex
CREATE INDEX "ArTestAnswer_arClipId_idx" ON "ArTestAnswer"("arClipId");

-- AddForeignKey
ALTER TABLE "ArClip" ADD CONSTRAINT "ArClip_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArTestSession" ADD CONSTRAINT "ArTestSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArTestAnswer" ADD CONSTRAINT "ArTestAnswer_arTestSessionId_fkey" FOREIGN KEY ("arTestSessionId") REFERENCES "ArTestSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArTestAnswer" ADD CONSTRAINT "ArTestAnswer_arClipId_fkey" FOREIGN KEY ("arClipId") REFERENCES "ArClip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
