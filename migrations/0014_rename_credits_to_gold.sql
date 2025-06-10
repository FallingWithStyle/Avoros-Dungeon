
-- Migration: Rename credits to gold for crawlers
ALTER TABLE crawlers RENAME COLUMN credits TO gold;
