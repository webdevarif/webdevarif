CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"company" varchar(160),
	"email" varchar(255),
	"phone" varchar(50),
	"country" varchar(100),
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"default_amount_cents" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"source" text,
	"billing_address" text,
	"tax_id" varchar(80),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"business_name" varchar(160),
	"business_email" varchar(255),
	"business_phone" varchar(50),
	"business_address" text,
	"business_website" varchar(255),
	"logo_url" text,
	"tax_id" varchar(80),
	"default_currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"invoice_prefix" varchar(12) DEFAULT 'INV' NOT NULL,
	"next_invoice_seq" integer DEFAULT 1 NOT NULL,
	"default_due_days" integer DEFAULT 7 NOT NULL,
	"default_terms" text,
	"payment_instructions" text,
	"email_provider" text,
	"email_api_key_encrypted" text,
	"email_from_name" varchar(120),
	"email_from_email" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"number" varchar(40) NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"subtotal_cents" integer DEFAULT 0 NOT NULL,
	"discount_cents" integer DEFAULT 0 NOT NULL,
	"tax_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer DEFAULT 0 NOT NULL,
	"amount_paid_cents" integer DEFAULT 0 NOT NULL,
	"issue_date" timestamp with time zone DEFAULT now() NOT NULL,
	"due_date" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"notes" text,
	"terms" text,
	"bill_to_snapshot" text,
	"bill_from_snapshot" text,
	"public_token" varchar(40) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"work_log_id" uuid,
	"description" text NOT NULL,
	"detail" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_amount_cents" integer DEFAULT 0 NOT NULL,
	"amount_cents" integer DEFAULT 0 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL,
	"method" text,
	"reference" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"project_id" uuid,
	"invoice_id" uuid,
	"title" text NOT NULL,
	"notes" text,
	"category" text DEFAULT 'development' NOT NULL,
	"amount_cents" integer DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"status" text DEFAULT 'unbilled' NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"external_ref" text,
	"worked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_settings" ADD CONSTRAINT "client_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_logs" ADD CONSTRAINT "work_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_logs" ADD CONSTRAINT "work_logs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_logs" ADD CONSTRAINT "work_logs_project_id_tracked_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."tracked_projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_logs" ADD CONSTRAINT "work_logs_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clients_user_id_idx" ON "clients" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "clients_status_idx" ON "clients" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "clients_user_name_idx" ON "clients" USING btree ("user_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_user_number_idx" ON "invoices" USING btree ("user_id","number");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_public_token_idx" ON "invoices" USING btree ("public_token");--> statement-breakpoint
CREATE INDEX "invoices_user_id_idx" ON "invoices" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "invoices_client_id_idx" ON "invoices" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "invoices_status_idx" ON "invoices" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "invoice_items_invoice_id_idx" ON "invoice_items" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "invoice_items_work_log_id_idx" ON "invoice_items" USING btree ("work_log_id");--> statement-breakpoint
CREATE INDEX "invoice_payments_invoice_id_idx" ON "invoice_payments" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "work_logs_user_id_idx" ON "work_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "work_logs_client_id_idx" ON "work_logs" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "work_logs_invoice_id_idx" ON "work_logs" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "work_logs_project_id_idx" ON "work_logs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "work_logs_unbilled_idx" ON "work_logs" USING btree ("client_id","status","worked_at");
