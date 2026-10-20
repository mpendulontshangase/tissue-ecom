ALTER TABLE "products" ADD COLUMN "archived_at" timestamptz;
--> statement-breakpoint
CREATE TABLE "product_images" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL,
  "mime_type" text NOT NULL,
  "bytes" bytea NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "is_main" boolean DEFAULT false NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "product_images_product_id_idx" ON "product_images" USING btree ("product_id");
--> statement-breakpoint
CREATE TABLE "shop_settings" (
  "id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
  "shop_name" text DEFAULT 'Softmill' NOT NULL,
  "contact_phone" text DEFAULT '' NOT NULL,
  "contact_email" text DEFAULT '' NOT NULL,
  "facebook_url" text DEFAULT '' NOT NULL,
  "instagram_url" text DEFAULT '' NOT NULL,
  "tiktok_url" text DEFAULT '' NOT NULL,
  "whatsapp_url" text DEFAULT '' NOT NULL,
  "x_url" text DEFAULT '' NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
