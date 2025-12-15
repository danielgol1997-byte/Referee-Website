-- Alter Question to support law-specific filtering
ALTER TABLE "Question" ADD COLUMN "lawNumber" INTEGER;

-- Allow TestSession to link to optional MandatoryTest
ALTER TABLE "TestSession" ADD COLUMN "mandatoryTestId" TEXT;

-- New table for super-admin created mandatory tests
CREATE TABLE "MandatoryTest" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "lawNumbers" INTEGER[] NOT NULL,
    "totalQuestions" INTEGER NOT NULL DEFAULT 10,
    "passingScore" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MandatoryTest_pkey" PRIMARY KEY ("id")
);

-- New table to track completion of mandatory tests by users
CREATE TABLE "UserTestCompletion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mandatoryTestId" TEXT NOT NULL,
    "testSessionId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "score" INTEGER,
    "passed" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserTestCompletion_pkey" PRIMARY KEY ("id")
);

-- Indexes for uniqueness and lookup
CREATE UNIQUE INDEX "UserTestCompletion_testSessionId_key" ON "UserTestCompletion"("testSessionId");
CREATE UNIQUE INDEX "UserTestCompletion_userId_mandatoryTestId_key" ON "UserTestCompletion"("userId", "mandatoryTestId");

-- Foreign keys
ALTER TABLE "MandatoryTest" ADD CONSTRAINT "MandatoryTest_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MandatoryTest" ADD CONSTRAINT "MandatoryTest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TestSession" ADD CONSTRAINT "TestSession_mandatoryTestId_fkey" FOREIGN KEY ("mandatoryTestId") REFERENCES "MandatoryTest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserTestCompletion" ADD CONSTRAINT "UserTestCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserTestCompletion" ADD CONSTRAINT "UserTestCompletion_mandatoryTestId_fkey" FOREIGN KEY ("mandatoryTestId") REFERENCES "MandatoryTest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserTestCompletion" ADD CONSTRAINT "UserTestCompletion_testSessionId_fkey" FOREIGN KEY ("testSessionId") REFERENCES "TestSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
