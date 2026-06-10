ALTER TABLE "english_tutor_sessions" ADD COLUMN "scenario" text DEFAULT 'free_talk' NOT NULL;--> statement-breakpoint
ALTER TABLE "english_tutor_sessions" ADD COLUMN "level" text DEFAULT 'intermediate' NOT NULL;--> statement-breakpoint
ALTER TABLE "english_tutor_sessions" ADD COLUMN "goal" text;--> statement-breakpoint
ALTER TABLE "english_tutor_sessions" ADD COLUMN "report" jsonb;--> statement-breakpoint
ALTER TABLE "english_tutor_sessions" ADD COLUMN "fluency_score" integer;--> statement-breakpoint
ALTER TABLE "english_tutor_sessions" ADD COLUMN "ended_at" timestamp with time zone;