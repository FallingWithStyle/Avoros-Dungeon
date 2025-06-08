
CREATE TABLE "mobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_id" integer NOT NULL,
	"enemy_id" integer NOT NULL,
	"position_x" numeric(5,2) NOT NULL,
	"position_y" numeric(5,2) NOT NULL,
	"current_health" integer NOT NULL,
	"max_health" integer NOT NULL,
	"is_alive" boolean DEFAULT true NOT NULL,
	"last_killed_at" timestamp,
	"respawn_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "mobs" ADD CONSTRAINT "mobs_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mobs" ADD CONSTRAINT "mobs_enemy_id_enemies_id_fk" FOREIGN KEY ("enemy_id") REFERENCES "public"."enemies"("id") ON DELETE no action ON UPDATE no action;
