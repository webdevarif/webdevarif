-- work_logs becomes tasks: a client asks for something, you do it, then it
-- gets billed. Written as RENAME/ALTER rather than DROP so it is safe on a
-- database that already holds rows.
ALTER TABLE "work_logs" RENAME TO "tasks";--> statement-breakpoint

-- `notes` was "what I did" — that is the report.
ALTER TABLE "tasks" RENAME COLUMN "notes" TO "report";--> statement-breakpoint
-- the old `status` tracked money, not work
ALTER TABLE "tasks" RENAME COLUMN "status" TO "billing_status";--> statement-breakpoint

ALTER TABLE "tasks" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "status" text DEFAULT 'requested' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint

-- Anything logged under the old model was work that had already been done.
UPDATE "tasks" SET "completed_at" = "worked_at", "status" = 'done';--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN "worked_at";--> statement-breakpoint

-- A table rename leaves constraints and indexes carrying the old name.
ALTER TABLE "tasks" RENAME CONSTRAINT "work_logs_pkey" TO "tasks_pkey";--> statement-breakpoint
ALTER TABLE "tasks" RENAME CONSTRAINT "work_logs_user_id_users_id_fk" TO "tasks_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "tasks" RENAME CONSTRAINT "work_logs_client_id_clients_id_fk" TO "tasks_client_id_clients_id_fk";--> statement-breakpoint
ALTER TABLE "tasks" RENAME CONSTRAINT "work_logs_project_id_tracked_projects_id_fk" TO "tasks_project_id_tracked_projects_id_fk";--> statement-breakpoint
ALTER TABLE "tasks" RENAME CONSTRAINT "work_logs_invoice_id_invoices_id_fk" TO "tasks_invoice_id_invoices_id_fk";--> statement-breakpoint

ALTER INDEX "work_logs_user_id_idx" RENAME TO "tasks_user_id_idx";--> statement-breakpoint
ALTER INDEX "work_logs_client_id_idx" RENAME TO "tasks_client_id_idx";--> statement-breakpoint
ALTER INDEX "work_logs_invoice_id_idx" RENAME TO "tasks_invoice_id_idx";--> statement-breakpoint
ALTER INDEX "work_logs_project_id_idx" RENAME TO "tasks_project_id_idx";--> statement-breakpoint

-- The billable lookup now has to consider work state as well as money state.
-- IF EXISTS because the old index covered `worked_at`, so dropping that column
-- above already took the index with it.
DROP INDEX IF EXISTS "work_logs_unbilled_idx";--> statement-breakpoint
CREATE INDEX "tasks_billable_idx" ON "tasks" USING btree ("client_id","status","billing_status","completed_at");--> statement-breakpoint

-- invoice_items points at tasks now (still a soft reference, no FK).
ALTER TABLE "invoice_items" RENAME COLUMN "work_log_id" TO "task_id";--> statement-breakpoint
ALTER INDEX "invoice_items_work_log_id_idx" RENAME TO "invoice_items_task_id_idx";--> statement-breakpoint

CREATE TABLE "task_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text DEFAULT 'reference' NOT NULL,
	"storage_key" text NOT NULL,
	"file_name" text,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"caption" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_attachments_task_id_idx" ON "task_attachments" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_attachments_user_id_idx" ON "task_attachments" USING btree ("user_id");
