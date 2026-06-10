CREATE TABLE "outreach_tracker" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"contact_name" varchar(150),
	"contact_email" varchar(255),
	"company_name" varchar(200),
	"website" text,
	"linkedin_url" text,
	"channel" varchar(50) DEFAULT 'email' NOT NULL,
	"subject" varchar(300),
	"message_preview" text,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"priority" varchar(20) DEFAULT 'medium' NOT NULL,
	"sent_at" timestamp with time zone,
	"last_follow_up_at" timestamp with time zone,
	"next_follow_up_at" timestamp with time zone,
	"follow_up_count" integer DEFAULT 0 NOT NULL,
	"replied_at" timestamp with time zone,
	"response_note" text,
	"estimated_value" integer,
	"actual_value" integer,
	"source" varchar(100),
	"notes" text,
	"tags" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "outreach_tracker" ADD CONSTRAINT "outreach_tracker_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "outreach_tracker_user_id_idx" ON "outreach_tracker" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "outreach_tracker_status_idx" ON "outreach_tracker" USING btree ("status");--> statement-breakpoint
CREATE INDEX "outreach_tracker_next_follow_up_idx" ON "outreach_tracker" USING btree ("next_follow_up_at");--> statement-breakpoint
CREATE INDEX "outreach_tracker_priority_idx" ON "outreach_tracker" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "outreach_tracker_created_at_idx" ON "outreach_tracker" USING btree ("created_at");