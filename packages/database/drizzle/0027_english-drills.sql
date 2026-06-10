CREATE TABLE "english_drills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"sentence" text NOT NULL,
	"scenario" varchar(80),
	"category" varchar(40) DEFAULT 'small_talk' NOT NULL,
	"user_transcript" text,
	"score" integer,
	"feedback" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "english_drills" ADD CONSTRAINT "english_drills_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "english_drills_user_id_idx" ON "english_drills" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "english_drills_created_at_idx" ON "english_drills" USING btree ("created_at");