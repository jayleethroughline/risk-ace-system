CREATE TABLE "eval_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"input_text" text,
	"predicted_category" text,
	"predicted_risk" text,
	"true_category" text,
	"true_risk" text,
	"correct" integer,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "playbook" (
	"bullet_id" text PRIMARY KEY NOT NULL,
	"section" text,
	"content" text,
	"helpful_count" integer DEFAULT 0,
	"harmful_count" integer DEFAULT 0,
	"last_updated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reflections" (
	"reflection_id" serial PRIMARY KEY NOT NULL,
	"error_type" text,
	"correct_approach" text,
	"key_insight" text,
	"affected_section" text,
	"tag" text,
	"created_at" timestamp DEFAULT now()
);
