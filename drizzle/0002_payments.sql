ALTER TYPE "payment_method" ADD VALUE IF NOT EXISTS 'yoco';
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "yoco_checkout_id" text;
--> statement-breakpoint
CREATE INDEX "orders_yoco_checkout_id_idx" ON "orders" USING btree ("yoco_checkout_id");
--> statement-breakpoint
CREATE TABLE "payment_settings" (
  "id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
  "yoco_enabled" boolean DEFAULT false NOT NULL,
  "eft_enabled" boolean DEFAULT true NOT NULL,
  "yoco_public_key" text DEFAULT '' NOT NULL,
  "yoco_secret_key" text DEFAULT '' NOT NULL,
  "yoco_webhook_secret" text DEFAULT '' NOT NULL,
  "bank_account_name" text DEFAULT '' NOT NULL,
  "bank_name" text DEFAULT '' NOT NULL,
  "bank_account_number" text DEFAULT '' NOT NULL,
  "bank_branch_code" text DEFAULT '' NOT NULL,
  "bank_account_type" text DEFAULT '' NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider" text NOT NULL,
  "event_id" text NOT NULL,
  "order_id" uuid,
  "event_type" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "payment_events_provider_event_id_unique" UNIQUE("provider","event_id")
);
--> statement-breakpoint
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
