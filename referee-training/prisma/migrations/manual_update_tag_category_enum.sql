-- Manual migration to update TagCategory enum
-- First, update existing tags to use temporary values, then alter enum

-- Step 1: Update tags to use existing valid enum values temporarily
UPDATE "Tag" SET category = 'SCENARIO' WHERE category = 'GENERAL';
UPDATE "Tag" SET category = 'SCENARIO' WHERE category = 'CONCEPT';
-- COMPETITION can stay as SCENARIO

-- Step 2: Drop old enum and create new one
-- Note: This requires dropping and recreating the enum type
-- We'll do this carefully to preserve data

-- Create new enum type
DO $$ 
BEGIN
    -- Drop the old enum if it exists (after migration)
    -- For now, we'll add new values and remove old ones
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TagCategory') THEN
        -- Add new enum values
        ALTER TYPE "TagCategory" ADD VALUE IF NOT EXISTS 'CATEGORY';
        ALTER TYPE "TagCategory" ADD VALUE IF NOT EXISTS 'RESTARTS';
        ALTER TYPE "TagCategory" ADD VALUE IF NOT EXISTS 'CRITERIA';
        ALTER TYPE "TagCategory" ADD VALUE IF NOT EXISTS 'SANCTION';
        -- SCENARIO already exists
    END IF;
END $$;

-- Step 3: Update tags to new categories
-- Map based on tag names/content
UPDATE "Tag" SET category = 'CATEGORY' 
WHERE name IN ('Challenges', 'DOGSO', 'SPA', 'Handball', 'Holding', 'Illegal Use Of Arms', 
               'Penalty Area Decisions', 'Simulation', 'Advantage', 'Dissent', 'Referee Abuse', 
               'Offside', 'Teamwork', 'Laws Of The Game');

UPDATE "Tag" SET category = 'RESTARTS'
WHERE name IN ('Direct Free Kick', 'Indirect Free Kick', 'Penalty Kick', 'Dropped Ball',
               'Corner Kick', 'Goal Kick', 'Throw-In', 'Kick-Off');

UPDATE "Tag" SET category = 'CRITERIA'
WHERE name LIKE '%Careless%' OR name LIKE '%Reckless%' OR name LIKE '%Serious Foul%'
   OR name LIKE '%Violent%' OR name LIKE '%Hand%' OR name LIKE '%Arm%'
   OR name LIKE '%Interfering%' OR name LIKE '%Offside%' OR name LIKE '%DOGSO%'
   OR name LIKE '%Promising Attack%' OR name LIKE '%No Offence%' OR name LIKE '%Play On%'
   OR name LIKE '%Ball%' OR name LIKE '%Player%' OR name LIKE '%Obvious%'
   OR name LIKE '%Impact%' OR name LIKE '%Obstructing%' OR name LIKE '%Challenging%';

UPDATE "Tag" SET category = 'SANCTION'
WHERE name IN ('Yellow Card', 'Red Card', 'No Disciplinary Sanction Needed', 'Verbal Warning',
               'No Disciplinary Sanction', 'NO DISCIPLINARY SANCTION');

UPDATE "Tag" SET category = 'SCENARIO'
WHERE name IN ('Penalty', 'Free Kick', 'Kick Off', 'During Play', 'Throw In', 
               'Corner Kick Scenario', 'Goal Kick Scenario', 'Dropped Ball Scenario',
               'Penalty Area', 'Counter Attack', 'Set Piece');

-- Note: Old enum values (GENERAL, CONCEPT, COMPETITION) will remain in the enum
-- but won't be used. They can be removed in a future cleanup migration if needed.
