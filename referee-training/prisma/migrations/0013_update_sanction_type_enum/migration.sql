-- Update SanctionType enum to match Prisma schema
ALTER TYPE "SanctionType" RENAME TO "SanctionType_old";

CREATE TYPE "SanctionType" AS ENUM (
  'NO_CARD',
  'YELLOW_CARD',
  'SECOND_YELLOW',
  'RED_CARD_DOGSO',
  'RED_CARD_SFP',
  'RED_CARD_VC',
  'RED_CARD_OTHER'
);

ALTER TABLE "VideoClip"
  ALTER COLUMN "sanctionType" TYPE "SanctionType"
  USING (
    CASE
      WHEN "sanctionType"::text = 'NO_CARD' THEN 'NO_CARD'::"SanctionType"
      WHEN "sanctionType"::text = 'YELLOW_CARD' THEN 'YELLOW_CARD'::"SanctionType"
      WHEN "sanctionType"::text = 'DOUBLE_YELLOW' THEN 'SECOND_YELLOW'::"SanctionType"
      WHEN "sanctionType"::text = 'RED_CARD' THEN 'RED_CARD_OTHER'::"SanctionType"
      WHEN "sanctionType"::text = 'PENALTY' THEN 'NO_CARD'::"SanctionType"
      ELSE NULL
    END
  );

DROP TYPE "SanctionType_old";

