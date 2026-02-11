-- Persist admin-selected filters on video tests so any admin can edit reliably.
ALTER TABLE "VideoTest"
ADD COLUMN IF NOT EXISTS "adminFilters" JSONB;
