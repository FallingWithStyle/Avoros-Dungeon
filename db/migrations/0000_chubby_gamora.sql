CREATE TABLE "activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"crawler_id" integer,
	"type" varchar(30) NOT NULL,
	"message" text NOT NULL,
	"details" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crawler_classes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" text NOT NULL,
	"base_health" integer NOT NULL,
	"base_attack" integer NOT NULL,
	"base_defense" integer NOT NULL,
	"base_speed" integer NOT NULL,
	"base_wit" integer NOT NULL,
	"base_charisma" integer NOT NULL,
	"base_memory" integer NOT NULL,
	"base_luck" integer NOT NULL,
	CONSTRAINT "crawler_classes_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "crawler_equipment" (
	"id" serial PRIMARY KEY NOT NULL,
	"crawler_id" integer NOT NULL,
	"equipment_id" integer NOT NULL,
	"equipped" boolean DEFAULT false,
	"acquired_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crawler_positions" (
	"id" serial PRIMARY KEY NOT NULL,
	"crawler_id" integer NOT NULL,
	"room_id" integer NOT NULL,
	"entered_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crawlers" (
	"id" serial PRIMARY KEY NOT NULL,
	"sponsor_id" varchar NOT NULL,
	"name" varchar(50) NOT NULL,
	"background" text NOT NULL,
	"class_id" integer,
	"level" integer DEFAULT 0 NOT NULL,
	"current_floor" integer DEFAULT 1 NOT NULL,
	"health" integer NOT NULL,
	"max_health" integer NOT NULL,
	"attack" integer NOT NULL,
	"defense" integer NOT NULL,
	"speed" integer NOT NULL,
	"wit" integer NOT NULL,
	"charisma" integer NOT NULL,
	"memory" integer NOT NULL,
	"luck" integer NOT NULL,
	"credits" integer DEFAULT 0 NOT NULL,
	"experience" integer DEFAULT 0 NOT NULL,
	"energy" integer DEFAULT 100 NOT NULL,
	"max_energy" integer DEFAULT 100 NOT NULL,
	"competencies" text[] NOT NULL,
	"abilities" text[] NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"is_alive" boolean DEFAULT true NOT NULL,
	"sponsorship_type" varchar DEFAULT 'primary' NOT NULL,
	"season_number" integer DEFAULT 1 NOT NULL,
	"last_action" timestamp DEFAULT now(),
	"last_energy_regen" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "encounters" (
	"id" serial PRIMARY KEY NOT NULL,
	"crawler_id" integer NOT NULL,
	"floor_id" integer NOT NULL,
	"type" varchar(20) DEFAULT 'combat' NOT NULL,
	"enemy_id" integer,
	"npc_id" integer,
	"energy_cost" integer DEFAULT 10 NOT NULL,
	"status" varchar(20) DEFAULT 'active',
	"result" jsonb,
	"story_text" text,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "enemies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"health" integer NOT NULL,
	"attack" integer NOT NULL,
	"defense" integer NOT NULL,
	"speed" integer NOT NULL,
	"credits_reward" integer NOT NULL,
	"experience_reward" integer NOT NULL,
	"min_floor" integer DEFAULT 1,
	"max_floor" integer DEFAULT 100
);
--> statement-breakpoint
CREATE TABLE "equipment" (
	"id" serial PRIMARY KEY NOT NULL,
	"type_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"attack_bonus" integer DEFAULT 0,
	"defense_bonus" integer DEFAULT 0,
	"speed_bonus" integer DEFAULT 0,
	"wit_bonus" integer DEFAULT 0,
	"charisma_bonus" integer DEFAULT 0,
	"memory_bonus" integer DEFAULT 0,
	"health_bonus" integer DEFAULT 0,
	"rarity" varchar(20) DEFAULT 'common',
	"price" integer NOT NULL,
	"min_floor" integer DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE "equipment_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"slot" varchar(20) NOT NULL,
	CONSTRAINT "equipment_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "factions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"mob_type" text[] NOT NULL,
	"influence" integer DEFAULT 1 NOT NULL,
	"color" varchar(16),
	"icon" text
);
--> statement-breakpoint
CREATE TABLE "floors" (
	"id" serial PRIMARY KEY NOT NULL,
	"floor_number" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"difficulty" integer NOT NULL,
	"min_recommended_level" integer DEFAULT 1,
	CONSTRAINT "floors_floor_number_unique" UNIQUE("floor_number")
);
--> statement-breakpoint
CREATE TABLE "marketplace_listings" (
	"id" serial PRIMARY KEY NOT NULL,
	"seller_id" varchar NOT NULL,
	"equipment_id" integer NOT NULL,
	"price" integer NOT NULL,
	"quantity" integer DEFAULT 1,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "npcs" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"personality" varchar(50) NOT NULL,
	"dialogue" text[] NOT NULL,
	"services" text[] NOT NULL,
	"floor_range" text DEFAULT '1-5' NOT NULL,
	"rarity" varchar(20) DEFAULT 'common' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_room_id" integer NOT NULL,
	"to_room_id" integer NOT NULL,
	"direction" varchar(10) NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL,
	"key_required" varchar(50),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"floor_id" integer NOT NULL,
	"x" integer NOT NULL,
	"y" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"type" varchar(30) DEFAULT 'normal' NOT NULL,
	"is_explored" boolean DEFAULT false NOT NULL,
	"has_loot" boolean DEFAULT false NOT NULL,
	"is_safe" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" serial PRIMARY KEY NOT NULL,
	"season_number" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT false NOT NULL,
	"start_date" timestamp DEFAULT now(),
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "seasons_season_number_unique" UNIQUE("season_number")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"corporation_name" varchar NOT NULL,
	"corporation_type" varchar DEFAULT 'Mining Consortium' NOT NULL,
	"credits" integer DEFAULT 50000 NOT NULL,
	"sponsor_reputation" integer DEFAULT 0 NOT NULL,
	"active_crawler_id" integer,
	"primary_sponsorship_used" boolean DEFAULT false NOT NULL,
	"last_primary_sponsorship_season" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_crawler_id_crawlers_id_fk" FOREIGN KEY ("crawler_id") REFERENCES "public"."crawlers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crawler_equipment" ADD CONSTRAINT "crawler_equipment_crawler_id_crawlers_id_fk" FOREIGN KEY ("crawler_id") REFERENCES "public"."crawlers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crawler_equipment" ADD CONSTRAINT "crawler_equipment_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crawler_positions" ADD CONSTRAINT "crawler_positions_crawler_id_crawlers_id_fk" FOREIGN KEY ("crawler_id") REFERENCES "public"."crawlers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crawler_positions" ADD CONSTRAINT "crawler_positions_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crawlers" ADD CONSTRAINT "crawlers_sponsor_id_users_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crawlers" ADD CONSTRAINT "crawlers_class_id_crawler_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."crawler_classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_crawler_id_crawlers_id_fk" FOREIGN KEY ("crawler_id") REFERENCES "public"."crawlers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_floor_id_floors_id_fk" FOREIGN KEY ("floor_id") REFERENCES "public"."floors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_enemy_id_enemies_id_fk" FOREIGN KEY ("enemy_id") REFERENCES "public"."enemies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_npc_id_npcs_id_fk" FOREIGN KEY ("npc_id") REFERENCES "public"."npcs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_type_id_equipment_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."equipment_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_connections" ADD CONSTRAINT "room_connections_from_room_id_rooms_id_fk" FOREIGN KEY ("from_room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_connections" ADD CONSTRAINT "room_connections_to_room_id_rooms_id_fk" FOREIGN KEY ("to_room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_floor_id_floors_id_fk" FOREIGN KEY ("floor_id") REFERENCES "public"."floors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");