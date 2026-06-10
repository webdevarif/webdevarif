CREATE TABLE "social_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"caption" text NOT NULL,
	"hashtags" jsonb NOT NULL,
	"image_prompt" text NOT NULL,
	"image_seed" integer NOT NULL,
	"image_width" integer DEFAULT 1024 NOT NULL,
	"image_height" integer DEFAULT 1024 NOT NULL,
	"variant_label" text DEFAULT 'Original' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"topic" text NOT NULL,
	"tone" text NOT NULL,
	"image_style" text NOT NULL,
	"platforms" jsonb NOT NULL,
	"model_used" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_session_id_social_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."social_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_sessions" ADD CONSTRAINT "social_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "social_posts_session_id_idx" ON "social_posts" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "social_posts_user_id_idx" ON "social_posts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "social_sessions_user_id_idx" ON "social_sessions" USING btree ("user_id");