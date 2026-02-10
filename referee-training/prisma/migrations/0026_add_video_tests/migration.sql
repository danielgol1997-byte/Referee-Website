-- CreateEnum
CREATE TYPE "VideoTestType" AS ENUM ('MANDATORY', 'PUBLIC', 'USER');

-- CreateTable
CREATE TABLE "VideoTest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "VideoTestType" NOT NULL,
    "totalClips" INTEGER NOT NULL DEFAULT 10,
    "dueDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoTestClip" (
    "id" TEXT NOT NULL,
    "videoTestId" TEXT NOT NULL,
    "videoClipId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VideoTestClip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoTestSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "videoTestId" TEXT NOT NULL,
    "clipIds" TEXT[],
    "totalClips" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoTestSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoTestAnswer" (
    "id" TEXT NOT NULL,
    "videoTestSessionId" TEXT NOT NULL,
    "videoClipId" TEXT NOT NULL,
    "playOnNoOffence" BOOLEAN NOT NULL DEFAULT false,
    "restartTagId" TEXT,
    "sanctionTagId" TEXT,
    "criteriaTagIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isCorrect" BOOLEAN NOT NULL,
    "isPartial" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "VideoTestAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoTestCompletion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "videoTestId" TEXT NOT NULL,
    "videoTestSessionId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "score" INTEGER,
    "passed" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoTestCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoTest_type_isActive_idx" ON "VideoTest"("type", "isActive");

-- CreateIndex
CREATE INDEX "VideoTest_createdById_idx" ON "VideoTest"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "VideoTestClip_videoTestId_videoClipId_key" ON "VideoTestClip"("videoTestId", "videoClipId");

-- CreateIndex
CREATE INDEX "VideoTestClip_videoTestId_idx" ON "VideoTestClip"("videoTestId");

-- CreateIndex
CREATE INDEX "VideoTestClip_videoClipId_idx" ON "VideoTestClip"("videoClipId");

-- CreateIndex
CREATE INDEX "VideoTestSession_userId_createdAt_idx" ON "VideoTestSession"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "VideoTestSession_videoTestId_idx" ON "VideoTestSession"("videoTestId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoTestAnswer_videoTestSessionId_videoClipId_key" ON "VideoTestAnswer"("videoTestSessionId", "videoClipId");

-- CreateIndex
CREATE INDEX "VideoTestAnswer_videoTestSessionId_idx" ON "VideoTestAnswer"("videoTestSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoTestCompletion_videoTestSessionId_key" ON "VideoTestCompletion"("videoTestSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoTestCompletion_userId_videoTestId_key" ON "VideoTestCompletion"("userId", "videoTestId");

-- CreateIndex
CREATE INDEX "VideoTestCompletion_userId_idx" ON "VideoTestCompletion"("userId");

-- CreateIndex
CREATE INDEX "VideoTestCompletion_videoTestId_idx" ON "VideoTestCompletion"("videoTestId");

-- AddForeignKey
ALTER TABLE "VideoTest" ADD CONSTRAINT "VideoTest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoTestClip" ADD CONSTRAINT "VideoTestClip_videoTestId_fkey" FOREIGN KEY ("videoTestId") REFERENCES "VideoTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoTestClip" ADD CONSTRAINT "VideoTestClip_videoClipId_fkey" FOREIGN KEY ("videoClipId") REFERENCES "VideoClip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoTestSession" ADD CONSTRAINT "VideoTestSession_videoTestId_fkey" FOREIGN KEY ("videoTestId") REFERENCES "VideoTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoTestSession" ADD CONSTRAINT "VideoTestSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoTestAnswer" ADD CONSTRAINT "VideoTestAnswer_videoTestSessionId_fkey" FOREIGN KEY ("videoTestSessionId") REFERENCES "VideoTestSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoTestCompletion" ADD CONSTRAINT "VideoTestCompletion_videoTestId_fkey" FOREIGN KEY ("videoTestId") REFERENCES "VideoTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoTestCompletion" ADD CONSTRAINT "VideoTestCompletion_videoTestSessionId_fkey" FOREIGN KEY ("videoTestSessionId") REFERENCES "VideoTestSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoTestCompletion" ADD CONSTRAINT "VideoTestCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
