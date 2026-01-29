-- Add performance indexes for Question and TestSession tables

-- Index for efficient Question filtering (used in createTestSession)
CREATE INDEX IF NOT EXISTS "Question_categoryId_type_isActive_idx" ON "Question"("categoryId", "type", "isActive");

-- Index for lawNumbers array queries
CREATE INDEX IF NOT EXISTS "Question_lawNumbers_idx" ON "Question" USING GIN ("lawNumbers");

-- Index for user's test sessions (used in session queries)
CREATE INDEX IF NOT EXISTS "TestSession_userId_createdAt_idx" ON "TestSession"("userId", "createdAt");

-- Index for mandatory test lookups
CREATE INDEX IF NOT EXISTS "TestSession_mandatoryTestId_idx" ON "TestSession"("mandatoryTestId");
