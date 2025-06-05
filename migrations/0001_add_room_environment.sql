
-- Add environment column to rooms table
ALTER TABLE "rooms" ADD COLUMN "environment" varchar(20) DEFAULT 'indoor' NOT NULL;
