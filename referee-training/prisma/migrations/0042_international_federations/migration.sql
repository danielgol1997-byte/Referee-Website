-- International federations: confederations (FIFA, UEFA, ...) become
-- Associations flagged isInternational, each with its own categories (Rank).
-- Referees keep their national FA and may additionally join one international
-- federation with a category inside it.

-- 1. Schema ------------------------------------------------------------
ALTER TABLE "Association" ADD COLUMN "isInternational" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "User" ADD COLUMN "internationalAssociationId" TEXT;

ALTER TABLE "User" ADD CONSTRAINT "User_internationalAssociationId_fkey"
  FOREIGN KEY ("internationalAssociationId") REFERENCES "Association"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "User_internationalAssociationId_idx" ON "User"("internationalAssociationId");

-- 2. Seed the real-world confederations --------------------------------
-- FIFA + the six continental confederations, with their published referee
-- category systems (editable later from the Federations tab).
INSERT INTO "Association" ("id", "name", "countryCode", "isInternational", "isActive", "createdAt", "updatedAt")
VALUES
  ('intfed_fifa',      'FIFA',      NULL, true, true, NOW(), NOW()),
  ('intfed_uefa',      'UEFA',      NULL, true, true, NOW(), NOW()),
  ('intfed_conmebol',  'CONMEBOL',  NULL, true, true, NOW(), NOW()),
  ('intfed_concacaf',  'CONCACAF',  NULL, true, true, NOW(), NOW()),
  ('intfed_caf',       'CAF',       NULL, true, true, NOW(), NOW()),
  ('intfed_afc',       'AFC',       NULL, true, true, NOW(), NOW()),
  ('intfed_ofc',       'OFC',       NULL, true, true, NOW(), NOW())
ON CONFLICT ("name") DO UPDATE SET "isInternational" = true;

INSERT INTO "Rank" ("id", "name", "order", "associationId", "isActive", "createdAt", "updatedAt")
VALUES
  -- FIFA: International Lists (badge categories)
  ('intfed_fifa_ref',      'International Referee',           0, 'intfed_fifa', true, NOW(), NOW()),
  ('intfed_fifa_ar',       'International Assistant Referee', 1, 'intfed_fifa', true, NOW(), NOW()),
  ('intfed_fifa_vmo',      'Video Match Official',            2, 'intfed_fifa', true, NOW(), NOW()),
  ('intfed_fifa_futsal',   'Futsal Referee',                  3, 'intfed_fifa', true, NOW(), NOW()),
  ('intfed_fifa_beach',    'Beach Soccer Referee',            4, 'intfed_fifa', true, NOW(), NOW()),
  -- UEFA: Elite / First / Second / Third categories
  ('intfed_uefa_elite',    'Elite',                           0, 'intfed_uefa', true, NOW(), NOW()),
  ('intfed_uefa_first',    'First Category',                  1, 'intfed_uefa', true, NOW(), NOW()),
  ('intfed_uefa_second',   'Second Category',                 2, 'intfed_uefa', true, NOW(), NOW()),
  ('intfed_uefa_third',    'Third Category',                  3, 'intfed_uefa', true, NOW(), NOW()),
  -- CONMEBOL
  ('intfed_conmebol_elite','Elite',                           0, 'intfed_conmebol', true, NOW(), NOW()),
  ('intfed_conmebol_cat1', 'Category 1',                      1, 'intfed_conmebol', true, NOW(), NOW()),
  ('intfed_conmebol_cat2', 'Category 2',                      2, 'intfed_conmebol', true, NOW(), NOW()),
  -- CONCACAF
  ('intfed_concacaf_elite','Elite',                           0, 'intfed_concacaf', true, NOW(), NOW()),
  ('intfed_concacaf_cat1', 'Category 1',                      1, 'intfed_concacaf', true, NOW(), NOW()),
  ('intfed_concacaf_cat2', 'Category 2',                      2, 'intfed_concacaf', true, NOW(), NOW()),
  -- CAF: Elite A / Elite B / young talents pathway
  ('intfed_caf_elite_a',   'Elite A',                         0, 'intfed_caf', true, NOW(), NOW()),
  ('intfed_caf_elite_b',   'Elite B',                         1, 'intfed_caf', true, NOW(), NOW()),
  ('intfed_caf_cat1',      'Category 1',                      2, 'intfed_caf', true, NOW(), NOW()),
  ('intfed_caf_young',     'Young Talents',                   3, 'intfed_caf', true, NOW(), NOW()),
  -- AFC: Elite Panel + panel/academy pathway
  ('intfed_afc_elite',     'Elite Panel',                     0, 'intfed_afc', true, NOW(), NOW()),
  ('intfed_afc_panel',     'Panel',                           1, 'intfed_afc', true, NOW(), NOW()),
  ('intfed_afc_academy',   'Referee Academy',                 2, 'intfed_afc', true, NOW(), NOW()),
  -- OFC: badge system
  ('intfed_ofc_elite',     'Elite',                           0, 'intfed_ofc', true, NOW(), NOW()),
  ('intfed_ofc_cat1',      'Category 1 (OFC Badge)',          1, 'intfed_ofc', true, NOW(), NOW()),
  ('intfed_ofc_cat2',      'Category 2 (Academy Badge)',      2, 'intfed_ofc', true, NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;

-- 3. Convert legacy international panels --------------------------------
-- Old model: a Rank with associationId NULL *was* the panel (e.g. "UEFA").
-- Create a federation for any legacy panel name not already seeded ...
INSERT INTO "Association" ("id", "name", "countryCode", "isInternational", "isActive", "createdAt", "updatedAt")
SELECT 'intfed_legacy_' || md5(r."name"), r."name", NULL, true, true, NOW(), NOW()
FROM "Rank" r
WHERE r."associationId" IS NULL
ON CONFLICT ("name") DO NOTHING;

-- ... move users from the legacy panel to the matching federation
-- (unranked inside it, an admin can pick the category) ...
UPDATE "User" u
SET "internationalAssociationId" = a."id",
    "internationalRankId" = NULL
FROM "Rank" r
JOIN "Association" a ON a."name" = r."name" AND a."isInternational" = true
WHERE u."internationalRankId" = r."id"
  AND r."associationId" IS NULL;

-- ... and remove the legacy panel rows.
DELETE FROM "Rank" WHERE "associationId" IS NULL;
