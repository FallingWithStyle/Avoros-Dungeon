
-- First, add the new equipment columns to the equipment table
ALTER TABLE equipment ADD COLUMN weapon_type VARCHAR(30);
ALTER TABLE equipment ADD COLUMN damage_attribute VARCHAR(20);
ALTER TABLE equipment ADD COLUMN base_range INTEGER DEFAULT 1;
ALTER TABLE equipment ADD COLUMN special_ability TEXT;
ALTER TABLE equipment ADD COLUMN defense_value INTEGER DEFAULT 0;
ALTER TABLE equipment ADD COLUMN armor_slot VARCHAR(20);
ALTER TABLE equipment ADD COLUMN armor_set VARCHAR(50);
ALTER TABLE equipment ADD COLUMN block_chance INTEGER DEFAULT 0;

-- Add the category column to equipment_types with a default value first
ALTER TABLE equipment_types ADD COLUMN category VARCHAR(20) DEFAULT 'tool';

-- Update existing equipment types with proper categories
UPDATE equipment_types SET category = 'weapon' WHERE name = 'Weapon';
UPDATE equipment_types SET category = 'armor' WHERE name = 'Armor';
UPDATE equipment_types SET category = 'tool' WHERE name = 'Tool';
UPDATE equipment_types SET category = 'consumable' WHERE name = 'Consumable';
UPDATE equipment_types SET category = 'accessory' WHERE name = 'Accessory';

-- Now make category NOT NULL after all values are set
ALTER TABLE equipment_types ALTER COLUMN category SET NOT NULL;

-- Add description column
ALTER TABLE equipment_types ADD COLUMN description TEXT;

-- Now safely drop the slot column
ALTER TABLE equipment_types DROP COLUMN slot;

-- Add shield type
INSERT INTO equipment_types (name, category, description) 
VALUES ('Shield', 'shield', 'Defensive equipment that can actively block attacks');
