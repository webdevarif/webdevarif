CREATE TABLE "short_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"slug" varchar(100) NOT NULL,
	"original_url" text NOT NULL,
	"title" varchar(200),
	"is_active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp with time zone,
	"click_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "link_clicks" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"link_id" uuid NOT NULL,
	"ip" varchar(45),
	"country" varchar(80),
	"city" varchar(120),
	"region" varchar(120),
	"latitude" real,
	"longitude" real,
	"referrer" text,
	"user_agent" text,
	"browser" varchar(60),
	"os" varchar(60),
	"device" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "short_links" ADD CONSTRAINT "short_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link_clicks" ADD CONSTRAINT "link_clicks_link_id_short_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."short_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "short_links_slug_idx" ON "short_links" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "short_links_user_id_idx" ON "short_links" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "link_clicks_link_id_created_idx" ON "link_clicks" USING btree ("link_id","created_at");--> statement-breakpoint
CREATE INDEX "link_clicks_link_id_country_idx" ON "link_clicks" USING btree ("link_id","country");