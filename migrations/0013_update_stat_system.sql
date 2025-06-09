
-- Update crawler_classes table
ALTER TABLE crawler_classes 
  RENAME COLUMN base_attack TO base_might;
ALTER TABLE crawler_classes 
  RENAME COLUMN base_defense TO base_endurance;
ALTER TABLE crawler_classes 
  RENAME COLUMN base_speed TO base_agility;
ALTER TABLE crawler_classes 
  RENAME COLUMN base_wit TO base_intellect;
ALTER TABLE crawler_classes 
  RENAME COLUMN base_memory TO base_wisdom;

-- Add new columns to crawler_classes
ALTER TABLE crawler_classes 
  ADD COLUMN base_vitality integer NOT NULL DEFAULT 10;
ALTER TABLE crawler_classes 
  ADD COLUMN base_focus integer NOT NULL DEFAULT 10;

-- Update crawlers table
ALTER TABLE crawlers 
  RENAME COLUMN attack TO might;
ALTER TABLE crawlers 
  RENAME COLUMN defense TO endurance;
ALTER TABLE crawlers 
  RENAME COLUMN speed TO agility;
ALTER TABLE crawlers 
  RENAME COLUMN wit TO intellect;
ALTER TABLE crawlers 
  RENAME COLUMN memory TO wisdom;

-- Add new columns to crawlers
ALTER TABLE crawlers 
  ADD COLUMN vitality integer NOT NULL DEFAULT 10;
ALTER TABLE crawlers 
  ADD COLUMN focus integer NOT NULL DEFAULT 10;

-- Update equipment table
ALTER TABLE equipment 
  RENAME COLUMN attack_bonus TO might_bonus;
ALTER TABLE equipment 
  RENAME COLUMN defense_bonus TO endurance_bonus;
ALTER TABLE equipment 
  RENAME COLUMN speed_bonus TO agility_bonus;
ALTER TABLE equipment 
  RENAME COLUMN wit_bonus TO intellect_bonus;
ALTER TABLE equipment 
  RENAME COLUMN memory_bonus TO wisdom_bonus;

-- Add new columns to equipment
ALTER TABLE equipment 
  ADD COLUMN vitality_bonus integer DEFAULT 0;
ALTER TABLE equipment 
  ADD COLUMN focus_bonus integer DEFAULT 0;

-- Update existing crawler data to use vitality-based health calculation
UPDATE crawlers 
SET vitality = GREATEST(1, maxHealth / 10),
    focus = GREATEST(1, maxEnergy / 10);
