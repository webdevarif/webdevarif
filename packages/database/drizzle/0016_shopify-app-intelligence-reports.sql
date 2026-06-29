CREATE TABLE "tracked_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"project_url" text NOT NULL,
	"api_endpoint" text NOT NULL,
	"api_key_encrypted" text,
	"platform" text DEFAULT 'custom' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"last_synced_at" timestamp with time zone,
	"last_sync_error" text,
	"last_snapshot" jsonb,
	"report_schedule" text DEFAULT 'daily' NOT NULL,
	"report_hour" text DEFAULT '09:00' NOT NULL,
	"last_report_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"data" jsonb NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_intelligence_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"report" jsonb NOT NULL,
	"overall_health_score" integer NOT NULL,
	"model_used" text,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feed_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"schedule_hour" text DEFAULT '08:00' NOT NULL,
	"last_synced_at" timestamp with time zone,
	"last_sync_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feed_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"url" text,
	"platform" text DEFAULT 'web' NOT NULL,
	"relevance_score" integer DEFAULT 50 NOT NULL,
	"ai_reason" text,
	"category" text NOT NULL,
	"metadata" jsonb,
	"images" jsonb,
	"reaction" text,
	"status" text DEFAULT 'new' NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_profile_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"profile_url" text,
	"input_method" text NOT NULL,
	"screenshot_uri" text NOT NULL,
	"overall_score" integer NOT NULL,
	"analysis" jsonb NOT NULL,
	"model_used" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shopify_app_intelligence_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_gid" text NOT NULL,
	"user_id" uuid NOT NULL,
	"report" jsonb NOT NULL,
	"health_score" integer NOT NULL,
	"model_used" text,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tracked_projects" ADD CONSTRAINT "tracked_projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_snapshots" ADD CONSTRAINT "project_snapshots_project_id_tracked_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."tracked_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_intelligence_reports" ADD CONSTRAINT "project_intelligence_reports_project_id_tracked_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."tracked_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_intelligence_reports" ADD CONSTRAINT "project_intelligence_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_sources" ADD CONSTRAINT "feed_sources_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_items" ADD CONSTRAINT "feed_items_source_id_feed_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."feed_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_items" ADD CONSTRAINT "feed_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_profile_analyses" ADD CONSTRAINT "social_profile_analyses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopify_app_intelligence_reports" ADD CONSTRAINT "shopify_app_intelligence_reports_app_gid_shopify_partner_apps_app_gid_fk" FOREIGN KEY ("app_gid") REFERENCES "public"."shopify_partner_apps"("app_gid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopify_app_intelligence_reports" ADD CONSTRAINT "shopify_app_intelligence_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tracked_projects_user_id_idx" ON "tracked_projects" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "project_snapshots_project_id_idx" ON "project_snapshots" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_snapshots_synced_at_idx" ON "project_snapshots" USING btree ("synced_at");--> statement-breakpoint
CREATE INDEX "project_snapshots_project_synced_idx" ON "project_snapshots" USING btree ("project_id","synced_at");--> statement-breakpoint
CREATE INDEX "project_reports_project_id_idx" ON "project_intelligence_reports" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_reports_generated_at_idx" ON "project_intelligence_reports" USING btree ("generated_at");--> statement-breakpoint
CREATE INDEX "feed_sources_user_id_idx" ON "feed_sources" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "feed_items_user_id_idx" ON "feed_items" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "feed_items_source_id_idx" ON "feed_items" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "feed_items_status_idx" ON "feed_items" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "feed_items_synced_at_idx" ON "feed_items" USING btree ("synced_at");--> statement-breakpoint
CREATE INDEX "social_profile_analyses_user_id_idx" ON "social_profile_analyses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "social_profile_analyses_created_at_idx" ON "social_profile_analyses" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "social_profile_analyses_user_platform_idx" ON "social_profile_analyses" USING btree ("user_id","platform");--> statement-breakpoint
CREATE INDEX "shopify_reports_app_gid_idx" ON "shopify_app_intelligence_reports" USING btree ("app_gid");--> statement-breakpoint
CREATE INDEX "shopify_reports_generated_at_idx" ON "shopify_app_intelligence_reports" USING btree ("generated_at");