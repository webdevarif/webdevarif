CREATE TABLE "social_post_images" (
	"post_id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"bytes" "bytea" NOT NULL,
	"content_type" text DEFAULT 'image/png' NOT NULL,
	"provider" text NOT NULL,
	"model" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "social_posts" ADD COLUMN "image_provider" text;--> statement-breakpoint
ALTER TABLE "social_posts" ADD COLUMN "image_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "social_posts" ADD COLUMN "image_error" text;--> statement-breakpoint
ALTER TABLE "social_post_images" ADD CONSTRAINT "social_post_images_post_id_social_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."social_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_post_images" ADD CONSTRAINT "social_post_images_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "social_post_images_user_id_idx" ON "social_post_images" USING btree ("user_id");