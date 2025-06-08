
CREATE TABLE IF NOT EXISTS "tactical_positions" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_id" integer NOT NULL,
	"entity_type" varchar(20) NOT NULL,
	"entity_data" jsonb NOT NULL,
	"position_x" numeric(5,2) NOT NULL,
	"position_y" numeric(5,2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

DO $$ BEGIN
 ALTER TABLE "tactical_positions" ADD CONSTRAINT "tactical_positions_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "tactical_positions_room_id_idx" ON "tactical_positions" ("room_id");
CREATE INDEX IF NOT EXISTS "tactical_positions_room_active_idx" ON "tactical_positions" ("room_id", "is_active");
