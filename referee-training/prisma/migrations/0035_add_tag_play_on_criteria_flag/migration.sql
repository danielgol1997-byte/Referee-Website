-- Add isPlayOnCriteria flag to criteria tags.
-- false (default) = offense-type criteria, true = play-on / no-offence criteria.
ALTER TABLE "Tag"
ADD COLUMN "isPlayOnCriteria" BOOLEAN NOT NULL DEFAULT false;
