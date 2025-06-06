
-- Add room states table for persistent tactical data
CREATE TABLE IF NOT EXISTS "room_states" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_id" integer NOT NULL,
	"last_updated" timestamp DEFAULT now(),
	"mob_data" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"npc_data" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"loot_data" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"environment_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"mob_last_spawn" timestamp DEFAULT now(),
	"player_activity" integer DEFAULT 0 NOT NULL,
	"last_player_visit" timestamp,
	"is_depleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);

-- Add mob spawn configurations table
CREATE TABLE IF NOT EXISTS "mob_spawn_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_type" varchar(30) NOT NULL,
	"floor_range" varchar(20) NOT NULL,
	"faction_id" integer,
	"mob_types" text[] NOT NULL,
	"spawn_rate" numeric(3,2) DEFAULT '1.0' NOT NULL,
	"max_mobs" integer DEFAULT 3 NOT NULL,
	"respawn_time" integer DEFAULT 3600 NOT NULL,
	"activity_threshold" integer DEFAULT 100 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);

-- Add mob instances table
CREATE TABLE IF NOT EXISTS "mob_instances" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_id" integer NOT NULL,
	"mob_type" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"health" integer NOT NULL,
	"max_health" integer NOT NULL,
	"attack" integer NOT NULL,
	"defense" integer NOT NULL,
	"position_x" numeric(5,2) NOT NULL,
	"position_y" numeric(5,2) NOT NULL,
	"status" varchar(20) DEFAULT 'alive' NOT NULL,
	"last_action" timestamp DEFAULT now(),
	"spawned_at" timestamp DEFAULT now(),
	"death_time" timestamp,
	"loot_dropped" boolean DEFAULT false NOT NULL
);

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "room_states" ADD CONSTRAINT "room_states_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "mob_spawn_configs" ADD CONSTRAINT "mob_spawn_configs_faction_id_factions_id_fk" FOREIGN KEY ("faction_id") REFERENCES "factions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "mob_instances" ADD CONSTRAINT "mob_instances_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "idx_room_states_room_id" ON "room_states" ("room_id");
CREATE INDEX IF NOT EXISTS "idx_room_states_last_updated" ON "room_states" ("last_updated");
CREATE INDEX IF NOT EXISTS "idx_room_states_depleted" ON "room_states" ("is_depleted");
CREATE INDEX IF NOT EXISTS "idx_mob_instances_room_status" ON "mob_instances" ("room_id", "status");
CREATE INDEX IF NOT EXISTS "idx_mob_instances_spawned" ON "mob_instances" ("spawned_at");

-- Insert default spawn configurations
INSERT INTO "mob_spawn_configs" ("room_type", "floor_range", "mob_types", "max_mobs", "respawn_time") VALUES
  ('normal', '1-10', ARRAY['Guard', 'Cultist', 'Wraith'], 3, 3600),
  ('treasure', '1-10', ARRAY['Guardian', 'Trap'], 1, 7200),
  ('boss', '1-10', ARRAY['Boss'], 1, 86400),
  ('safe', '1-10', ARRAY[], 0, 99999)
ON CONFLICT DO NOTHING;
