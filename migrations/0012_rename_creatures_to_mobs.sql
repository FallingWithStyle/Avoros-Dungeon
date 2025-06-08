
-- Rename creature_types table to mob_types
ALTER TABLE creature_types RENAME TO mob_types;

-- Update mobs table to reference mob_types instead of creature_types
ALTER TABLE mobs RENAME COLUMN creature_type_id TO mob_type_id;

-- Update encounters table to reference mobs instead of enemies
-- Note: The column was already renamed in migration 0011, but ensure it's correct
-- ALTER TABLE encounters RENAME COLUMN enemy_id TO mob_id; -- This was already done in 0011

-- Update any remaining references in indexes or constraints if needed
-- (Most databases will automatically handle constraint renames with table renames)
