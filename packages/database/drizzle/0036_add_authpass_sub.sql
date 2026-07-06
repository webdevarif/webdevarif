ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "authpass_sub" text;--> statement-breakpoint
CREATE INDEX "users_authpass_sub_idx" ON "users" USING btree ("authpass_sub");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_authpass_sub_unique" UNIQUE("authpass_sub");