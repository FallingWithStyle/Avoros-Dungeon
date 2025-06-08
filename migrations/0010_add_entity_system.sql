
-- Add rarity column to enemies table
ALTER TABLE "enemies" ADD COLUMN "rarity" varchar(20) DEFAULT 'common' NOT NULL;

-- Add display name and rarity to mobs table
ALTER TABLE "mobs" ADD COLUMN "display_name" varchar(100) NOT NULL DEFAULT '';
ALTER TABLE "mobs" ADD COLUMN "rarity" varchar(20) DEFAULT 'common' NOT NULL;

-- Create loot items table
CREATE TABLE "loot_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"rarity" varchar(20) DEFAULT 'common' NOT NULL,
	"item_type" varchar(30) NOT NULL,
	"value" integer NOT NULL,
	"min_floor" integer DEFAULT 1,
	"max_floor" integer DEFAULT 100,
	"spawn_weight" integer DEFAULT 1 NOT NULL
);

-- Create room loot table
CREATE TABLE "room_loot" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_id" integer NOT NULL,
	"loot_item_id" integer NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"position_x" numeric(5,2) NOT NULL,
	"position_y" numeric(5,2) NOT NULL,
	"is_collected" boolean DEFAULT false NOT NULL,
	"collected_at" timestamp,
	"collected_by" integer,
	"created_at" timestamp DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE "room_loot" ADD CONSTRAINT "room_loot_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "room_loot" ADD CONSTRAINT "room_loot_loot_item_id_loot_items_id_fk" FOREIGN KEY ("loot_item_id") REFERENCES "public"."loot_items"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "room_loot" ADD CONSTRAINT "room_loot_collected_by_crawlers_id_fk" FOREIGN KEY ("collected_by") REFERENCES "public"."crawlers"("id") ON DELETE no action ON UPDATE no action;
