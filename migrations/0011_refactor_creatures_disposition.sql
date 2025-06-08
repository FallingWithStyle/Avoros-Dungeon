
-- Rename enemies table to creature_types and add new fields
ALTER TABLE enemies RENAME TO creature_types;

-- Add new columns to creature_types
ALTER TABLE creature_types 
ADD COLUMN category VARCHAR(30) NOT NULL DEFAULT 'combat',
ADD COLUMN base_disposition INTEGER NOT NULL DEFAULT 0,
ADD COLUMN services TEXT[] NOT NULL DEFAULT '{}',
ADD COLUMN dialogue TEXT[] NOT NULL DEFAULT '{}';

-- Update mobs table to reference creature_types and add disposition
ALTER TABLE mobs RENAME COLUMN enemy_id TO creature_type_id;
ALTER TABLE mobs 
ADD COLUMN disposition INTEGER NOT NULL DEFAULT 0,
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN last_interaction_at TIMESTAMP;

-- Update encounters table
ALTER TABLE encounters RENAME COLUMN enemy_id TO mob_id;
ALTER TABLE encounters DROP COLUMN npc_id;

-- Update existing creature types with appropriate categories and dispositions
UPDATE creature_types SET 
  category = 'combat',
  base_disposition = -50 
WHERE name LIKE '%Warrior%' OR name LIKE '%Soldier%' OR name LIKE '%Knight%';

UPDATE creature_types SET 
  category = 'boss',
  base_disposition = -75 
WHERE name LIKE '%Guardian%' OR name LIKE '%Lord%';

UPDATE creature_types SET 
  category = 'neutral',
  base_disposition = 0 
WHERE name LIKE '%Soul%' OR name LIKE '%Rat%' OR name LIKE '%Wolf%';

-- Update existing mobs with disposition based on their creature type
UPDATE mobs SET disposition = (
  SELECT base_disposition 
  FROM creature_types 
  WHERE creature_types.id = mobs.creature_type_id
);

-- Drop npcs table since all creatures are now mobs
DROP TABLE IF EXISTS npcs;
