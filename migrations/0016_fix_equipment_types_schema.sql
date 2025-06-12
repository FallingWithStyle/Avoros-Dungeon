
-- Drop dependent tables first
DROP TABLE IF EXISTS equipment CASCADE;
DROP TABLE IF EXISTS equipment_types CASCADE;

-- Recreate equipment_types with the correct schema
CREATE TABLE equipment_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    category VARCHAR(20) NOT NULL,
    description TEXT
);

-- Recreate equipment table with the new schema
CREATE TABLE equipment (
    id SERIAL PRIMARY KEY,
    type_id INTEGER NOT NULL REFERENCES equipment_types(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Weapon properties
    weapon_type VARCHAR(30),
    damage_attribute VARCHAR(20),
    base_range INTEGER DEFAULT 1,
    special_ability TEXT,
    
    -- Armor properties
    defense_value INTEGER DEFAULT 0,
    armor_slot VARCHAR(20),
    armor_set VARCHAR(50),
    
    -- Shield properties
    block_chance INTEGER DEFAULT 0,
    
    -- Stat bonuses
    might_bonus INTEGER DEFAULT 0,
    agility_bonus INTEGER DEFAULT 0,
    endurance_bonus INTEGER DEFAULT 0,
    intellect_bonus INTEGER DEFAULT 0,
    charisma_bonus INTEGER DEFAULT 0,
    wisdom_bonus INTEGER DEFAULT 0,
    power_bonus INTEGER DEFAULT 0,
    max_power_bonus INTEGER DEFAULT 0,
    health_bonus INTEGER DEFAULT 0,
    
    rarity VARCHAR(20) DEFAULT 'common',
    price INTEGER NOT NULL,
    min_floor INTEGER DEFAULT 1
);

-- Recreate crawler_equipment table
CREATE TABLE IF NOT EXISTS crawler_equipment (
    id SERIAL PRIMARY KEY,
    crawler_id INTEGER NOT NULL REFERENCES crawlers(id),
    equipment_id INTEGER NOT NULL REFERENCES equipment(id),
    equipped BOOLEAN DEFAULT false,
    acquired_at TIMESTAMP DEFAULT now()
);

-- Recreate marketplace_listings table
CREATE TABLE IF NOT EXISTS marketplace_listings (
    id SERIAL PRIMARY KEY,
    seller_id VARCHAR NOT NULL REFERENCES users(id),
    equipment_id INTEGER NOT NULL REFERENCES equipment(id),
    price INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now()
);
