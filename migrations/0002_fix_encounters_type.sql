
-- Check if encounter_type column exists and rename it, or create type column if it doesn't exist
DO $$
BEGIN
    -- Check if encounter_type column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'encounters' AND column_name = 'encounter_type') THEN
        -- Rename encounter_type to type
        ALTER TABLE "encounters" RENAME COLUMN "encounter_type" TO "type";
    ELSE
        -- Create type column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'encounters' AND column_name = 'type') THEN
            ALTER TABLE "encounters" ADD COLUMN "type" varchar(20) DEFAULT 'combat' NOT NULL;
        END IF;
    END IF;
END $$;
