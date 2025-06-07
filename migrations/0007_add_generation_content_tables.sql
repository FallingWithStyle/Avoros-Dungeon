
-- Add tables for dynamic content generation
CREATE TABLE "corporation_prefixes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"weight" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE "corporation_suffixes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"weight" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE "human_first_names" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"weight" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE "human_last_names" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"weight" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE "competencies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"weight" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE "starting_equipment" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"contextual_trigger" text,
	"weight" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now()
);
