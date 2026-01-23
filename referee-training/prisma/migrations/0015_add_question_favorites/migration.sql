-- CreateTable
CREATE TABLE "QuestionFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuestionFavorite_userId_questionId_key" ON "QuestionFavorite"("userId", "questionId");

-- CreateIndex
CREATE INDEX "QuestionFavorite_userId_idx" ON "QuestionFavorite"("userId");

-- AddForeignKey
ALTER TABLE "QuestionFavorite" ADD CONSTRAINT "QuestionFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionFavorite" ADD CONSTRAINT "QuestionFavorite_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
