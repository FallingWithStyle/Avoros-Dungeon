
-- Add active effects column to crawlers table for spell/skill effects
ALTER TABLE "crawlers" ADD COLUMN "active_effects" jsonb DEFAULT '[]' NOT NULL;
