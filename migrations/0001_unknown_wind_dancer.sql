ALTER TABLE "crawlers" ADD COLUMN "detect_range" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "crawlers" ADD COLUMN "analyze_range" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "faction_id" integer;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "placement_id" integer DEFAULT -1 NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "environment" varchar(20) DEFAULT 'indoors' NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "has_creatures" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "territory_status" varchar(10) DEFAULT 'neutral' NOT NULL;