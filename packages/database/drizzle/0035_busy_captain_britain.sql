CREATE TABLE "app_funnel_snapshots" (
	"app_gid" text NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"stages" jsonb NOT NULL,
	"top_count" integer NOT NULL,
	"breakdown" jsonb,
	"totals" jsonb,
	"entities" jsonb,
	"window_days" integer,
	CONSTRAINT "app_funnel_snapshots_app_gid_captured_at_pk" PRIMARY KEY("app_gid","captured_at")
);
--> statement-breakpoint
ALTER TABLE "shopify_partner_apps" ADD COLUMN "funnel_api_url" text;--> statement-breakpoint
ALTER TABLE "shopify_partner_apps" ADD COLUMN "funnel_api_token_encrypted" text;