-- Enable pgvector extension for embedding storage
CREATE EXTENSION IF NOT EXISTS vector;

-- Add AI semantic search fields to VideoClip (all nullable / with defaults, non-destructive)
ALTER TABLE "VideoClip" ADD COLUMN "rawAdminDescription" TEXT;
ALTER TABLE "VideoClip" ADD COLUMN "canonicalSearchText" TEXT;
ALTER TABLE "VideoClip" ADD COLUMN "searchSummary" TEXT;
ALTER TABLE "VideoClip" ADD COLUMN "searchKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "VideoClip" ADD COLUMN "searchDescriptionStatus" TEXT NOT NULL DEFAULT 'none';
ALTER TABLE "VideoClip" ADD COLUMN "searchDescriptionLang" TEXT;
ALTER TABLE "VideoClip" ADD COLUMN "aiProcessedAt" TIMESTAMP(3);
ALTER TABLE "VideoClip" ADD COLUMN "aiProcessedById" TEXT;

-- Add embedding column via pgvector (not managed by Prisma, handled via raw SQL)
ALTER TABLE "VideoClip" ADD COLUMN "embedding" vector(1536);

-- Create AiPromptConfig table for editable AI instructions
CREATE TABLE "AiPromptConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "systemPrompt" TEXT NOT NULL,
    "userPromptTemplate" TEXT,
    "model" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "maxTokens" INTEGER NOT NULL DEFAULT 2000,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "AiPromptConfig_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE UNIQUE INDEX "AiPromptConfig_key_key" ON "AiPromptConfig"("key");
CREATE INDEX "AiPromptConfig_key_isActive_idx" ON "AiPromptConfig"("key", "isActive");

-- Add foreign key for AiPromptConfig -> User
ALTER TABLE "AiPromptConfig" ADD CONSTRAINT "AiPromptConfig_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
