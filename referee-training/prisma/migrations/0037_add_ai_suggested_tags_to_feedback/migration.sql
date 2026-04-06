-- Add aiSuggestedTags column to AiGenerationFeedback
ALTER TABLE "AiGenerationFeedback"
  ADD COLUMN "aiSuggestedTags" TEXT[] NOT NULL DEFAULT '{}';
