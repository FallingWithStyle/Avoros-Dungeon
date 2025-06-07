
-- Add tables for dynamic content generation
CREATE TABLE IF NOT EXISTS "floor_themes" (
	"id" serial PRIMARY KEY NOT NULL,
	"floor_number" integer NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "floor_themes_floor_number_unique" UNIQUE("floor_number")
);

CREATE TABLE IF NOT EXISTS "room_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"floor_theme_id" integer,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"weight" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "crawler_backgrounds" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"story" text NOT NULL,
	"weight" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "pre_dungeon_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_title" text NOT NULL,
	"weight" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "combat_flavor_text" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"text" text NOT NULL,
	"weight" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now()
);

DO $$ BEGIN
 ALTER TABLE "room_types" ADD CONSTRAINT "room_types_floor_theme_id_floor_themes_id_fk" FOREIGN KEY ("floor_theme_id") REFERENCES "floor_themes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
