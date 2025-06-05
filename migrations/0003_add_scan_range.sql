
-- Add scan range to crawlers table
ALTER TABLE "crawlers" ADD COLUMN "scan_range" integer DEFAULT 2 NOT NULL;
