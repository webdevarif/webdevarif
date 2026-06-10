CREATE TABLE "project_personas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"source" varchar(16) NOT NULL,
	"name" text NOT NULL,
	"persona" jsonb NOT NULL,
	"segment" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_personas" ADD CONSTRAINT "project_personas_project_id_tracked_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."tracked_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_personas_project_id_idx" ON "project_personas" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_personas_project_source_idx" ON "project_personas" USING btree ("project_id","source");