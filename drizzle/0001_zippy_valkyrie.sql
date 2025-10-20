CREATE TABLE "agent_log" (
	"log_id" serial PRIMARY KEY NOT NULL,
	"run_id" integer,
	"epoch_number" integer,
	"agent_type" text,
	"system_prompt" text,
	"input_summary" text,
	"output_summary" text,
	"details" jsonb,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "epoch_result" (
	"epoch_id" serial PRIMARY KEY NOT NULL,
	"run_id" integer,
	"epoch_number" integer,
	"category_f1" real,
	"risk_f1" real,
	"overall_f1" real,
	"accuracy" real,
	"playbook_size" integer,
	"errors_found" integer,
	"heuristics_added" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "training_data" (
	"data_id" serial PRIMARY KEY NOT NULL,
	"run_id" integer,
	"data_type" text,
	"text" text,
	"true_category" text,
	"true_risk" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "training_run" (
	"run_id" serial PRIMARY KEY NOT NULL,
	"name" text,
	"max_epochs" integer DEFAULT 10,
	"plateau_threshold" real DEFAULT 0.01,
	"plateau_patience" integer DEFAULT 3,
	"status" text DEFAULT 'pending',
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
