CREATE TABLE "tracked_sites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"domain" varchar(255) NOT NULL,
	"public_key" varchar(40) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"replay_enabled" boolean DEFAULT false NOT NULL,
	"replay_sample_rate" integer DEFAULT 10 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tracked_sites_sample_rate_range" CHECK ("tracked_sites"."replay_sample_rate" >= 0 AND "tracked_sites"."replay_sample_rate" <= 100)
);
--> statement-breakpoint
CREATE TABLE "track_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"visitor_hash" varchar(64) NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"entry_page" text NOT NULL,
	"referrer" text,
	"utm_source" varchar(120),
	"utm_medium" varchar(120),
	"utm_campaign" varchar(120),
	"device_type" varchar(20),
	"browser" varchar(40),
	"os" varchar(40),
	"country" varchar(2),
	"screen_w" integer,
	"screen_h" integer,
	"is_bounce" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "track_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"site_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"type" varchar(30) NOT NULL,
	"name" varchar(120),
	"url_path" text NOT NULL,
	"props" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "track_replays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"events" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "track_daily_rollups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"date" date NOT NULL,
	"visitors" integer DEFAULT 0 NOT NULL,
	"sessions" integer DEFAULT 0 NOT NULL,
	"pageviews" integer DEFAULT 0 NOT NULL,
	"avg_duration_s" integer DEFAULT 0 NOT NULL,
	"bounce_rate" integer DEFAULT 0 NOT NULL,
	"top_pages" jsonb,
	"top_referrers" jsonb,
	"top_events" jsonb,
	"web_vitals" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "track_daily_salts" (
	"date" date PRIMARY KEY NOT NULL,
	"salt" varchar(64) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tracked_sites" ADD CONSTRAINT "tracked_sites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_sessions" ADD CONSTRAINT "track_sessions_site_id_tracked_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."tracked_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_events" ADD CONSTRAINT "track_events_site_id_tracked_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."tracked_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_events" ADD CONSTRAINT "track_events_session_id_track_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."track_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_replays" ADD CONSTRAINT "track_replays_site_id_tracked_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."tracked_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_replays" ADD CONSTRAINT "track_replays_session_id_track_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."track_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_daily_rollups" ADD CONSTRAINT "track_daily_rollups_site_id_tracked_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."tracked_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tracked_sites_public_key_idx" ON "tracked_sites" USING btree ("public_key");--> statement-breakpoint
CREATE INDEX "tracked_sites_user_id_idx" ON "tracked_sites" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tracked_sites_domain_idx" ON "tracked_sites" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "track_sessions_lookup_idx" ON "track_sessions" USING btree ("site_id","visitor_hash","last_seen_at");--> statement-breakpoint
CREATE INDEX "track_sessions_site_started_idx" ON "track_sessions" USING btree ("site_id","started_at");--> statement-breakpoint
CREATE INDEX "track_events_site_created_idx" ON "track_events" USING btree ("site_id","created_at");--> statement-breakpoint
CREATE INDEX "track_events_site_type_created_idx" ON "track_events" USING btree ("site_id","type","created_at");--> statement-breakpoint
CREATE INDEX "track_events_session_idx" ON "track_events" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "track_replays_session_chunk_idx" ON "track_replays" USING btree ("session_id","chunk_index");--> statement-breakpoint
CREATE INDEX "track_replays_site_created_idx" ON "track_replays" USING btree ("site_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "track_daily_rollups_site_date_idx" ON "track_daily_rollups" USING btree ("site_id","date");--> statement-breakpoint
CREATE INDEX "track_daily_rollups_date_idx" ON "track_daily_rollups" USING btree ("date");