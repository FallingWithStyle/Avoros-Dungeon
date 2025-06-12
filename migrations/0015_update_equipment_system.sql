
-- First, add the new equipment columns to the equipment table
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS weapon_type VARCHAR(30);
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS damage_attribute VARCHAR(20);
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS base_range INTEGER DEFAULT 1;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS special_ability TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS defense_value INTEGER DEFAULT 0;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS armor_slot VARCHAR(20);
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS armor_set VARCHAR(50);
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS block_chance INTEGER DEFAULT 0;

-- Add stat bonus columns to equipment
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS might_bonus INTEGER DEFAULT 0;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS agility_bonus INTEGER DEFAULT 0;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS endurance_bonus INTEGER DEFAULT 0;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS intellect_bonus INTEGER DEFAULT 0;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS charisma_bonus INTEGER DEFAULT 0;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS wisdom_bonus INTEGER DEFAULT 0;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS power_bonus INTEGER DEFAULT 0;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS max_power_bonus INTEGER DEFAULT 0;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS health_bonus INTEGER DEFAULT 0;

-- Add the category column to equipment_types with a default value first
ALTER TABLE equipment_types ADD COLUMN IF NOT EXISTS category VARCHAR(20) DEFAULT 'tool';

-- Add description column to equipment_types
ALTER TABLE equipment_types ADD COLUMN IF NOT EXISTS description TEXT;

-- Update existing equipment types with proper categories before making category NOT NULL
UPDATE equipment_types SET category = 'weapon' WHERE name = 'Weapon' AND category = 'tool';
UPDATE equipment_types SET category = 'armor' WHERE name = 'Armor' AND category = 'tool';
UPDATE equipment_types SET category = 'tool' WHERE name = 'Tool' AND category = 'tool';
UPDATE equipment_types SET category = 'consumable' WHERE name = 'Consumable' AND category = 'tool';
UPDATE equipment_types SET category = 'accessory' WHERE name = 'Accessory' AND category = 'tool';

-- Now make category NOT NULL after all values are set
ALTER TABLE equipment_types ALTER COLUMN category SET NOT NULL;

-- Drop the old slot column from equipment_types if it exists
ALTER TABLE equipment_types DROP COLUMN IF EXISTS slot;

-- Insert the Shield type if it doesn't already exist
INSERT INTO equipment_types (name, category, description) 
SELECT 'Shield', 'shield', 'Defensive equipment that can actively block attacks'
WHERE NOT EXISTS (SELECT 1 FROM equipment_types WHERE name = 'Shield');
