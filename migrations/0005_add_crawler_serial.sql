
ALTER TABLE "crawlers" ADD COLUMN "serial" integer;

-- Set a default serial for existing crawlers (using their ID as fallback)
UPDATE "crawlers" SET "serial" = "id" WHERE "serial" IS NULL;

-- Make the column NOT NULL after setting defaults
ALTER TABLE "crawlers" ALTER COLUMN "serial" SET NOT NULL;
