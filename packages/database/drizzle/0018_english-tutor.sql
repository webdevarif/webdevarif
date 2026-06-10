CREATE TABLE "english_tutor_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"corrections" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "english_tutor_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"mode" text DEFAULT 'client' NOT NULL,
	"title" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "english_tutor_messages" ADD CONSTRAINT "english_tutor_messages_session_id_english_tutor_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."english_tutor_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "english_tutor_messages" ADD CONSTRAINT "english_tutor_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "english_tutor_sessions" ADD CONSTRAINT "english_tutor_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "english_tutor_messages_session_id_idx" ON "english_tutor_messages" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "english_tutor_messages_created_at_idx" ON "english_tutor_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "english_tutor_sessions_user_id_idx" ON "english_tutor_sessions" USING btree ("user_id");