CREATE TABLE "project_health_aggregates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"date" date NOT NULL,
	"checks" integer DEFAULT 0 NOT NULL,
	"successes" integer DEFAULT 0 NOT NULL,
	"uptime_pct" integer DEFAULT 0 NOT NULL,
	"avg_response_ms" integer,
	"min_response_ms" integer,
	"max_response_ms" integer,
	"min_ssl_expiry_days" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_health_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status_code" integer,
	"response_ms" integer,
	"ttfb_ms" integer,
	"ssl_expiry_days" integer,
	"error_message" text
);
--> statement-breakpoint
ALTER TABLE "tracked_projects" ALTER COLUMN "api_endpoint" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tracked_projects" ADD COLUMN "domain" varchar(255);--> statement-breakpoint
ALTER TABLE "tracked_projects" ADD COLUMN "analytics_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tracked_projects" ADD COLUMN "api_metrics_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tracked_projects" ADD COLUMN "health_checks_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "tracked_sites" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "project_health_aggregates" ADD CONSTRAINT "project_health_aggregates_project_id_tracked_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."tracked_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_health_checks" ADD CONSTRAINT "project_health_checks_project_id_tracked_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."tracked_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_health_aggregates_project_date_idx" ON "project_health_aggregates" USING btree ("project_id","date");--> statement-breakpoint
CREATE INDEX "project_health_checks_project_checked_idx" ON "project_health_checks" USING btree ("project_id","checked_at");--> statement-breakpoint
CREATE INDEX "project_health_checks_checked_at_idx" ON "project_health_checks" USING btree ("checked_at");--> statement-breakpoint
ALTER TABLE "tracked_sites" ADD CONSTRAINT "tracked_sites_project_id_tracked_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."tracked_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tracked_projects_domain_idx" ON "tracked_projects" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "tracked_sites_project_id_idx" ON "tracked_sites" USING btree ("project_id");