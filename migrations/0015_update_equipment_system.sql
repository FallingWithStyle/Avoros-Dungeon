
-- Add new columns to equipment table
ALTER TABLE equipment ADD COLUMN weapon_type VARCHAR(30);
ALTER TABLE equipment ADD COLUMN damage_attribute VARCHAR(20);
ALTER TABLE equipment ADD COLUMN base_range INTEGER DEFAULT 1;
ALTER TABLE equipment ADD COLUMN special_ability TEXT;
ALTER TABLE equipment ADD COLUMN defense_value INTEGER DEFAULT 0;
ALTER TABLE equipment ADD COLUMN armor_slot VARCHAR(20);
ALTER TABLE equipment ADD COLUMN armor_set VARCHAR(50);
ALTER TABLE equipment ADD COLUMN block_chance INTEGER DEFAULT 0;

-- Update equipment_types table
ALTER TABLE equipment_types ADD COLUMN category VARCHAR(20) NOT NULL DEFAULT 'tool';
ALTER TABLE equipment_types ADD COLUMN description TEXT;
ALTER TABLE equipment_types DROP COLUMN slot;

-- Update existing equipment types
UPDATE equipment_types SET category = 'weapon' WHERE name = 'Weapon';
UPDATE equipment_types SET category = 'armor' WHERE name = 'Armor';
UPDATE equipment_types SET category = 'tool' WHERE name = 'Tool';
UPDATE equipment_types SET category = 'consumable' WHERE name = 'Consumable';
UPDATE equipment_types SET category = 'accessory' WHERE name = 'Accessory';

-- Add shield type
INSERT INTO equipment_types (name, category, description) VALUES ('Shield', 'shield', 'Defensive equipment that can actively block attacks');
