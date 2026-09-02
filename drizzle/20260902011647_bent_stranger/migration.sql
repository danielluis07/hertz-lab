CREATE TYPE "user_role" AS ENUM('admin', 'user');--> statement-breakpoint
CREATE TYPE "product_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "coupon_type" AS ENUM('percentage', 'fixed_amount', 'free_shipping');--> statement-breakpoint
CREATE TYPE "order_status" AS ENUM('pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "payment_method" AS ENUM('pix', 'credit_card', 'boleto');--> statement-breakpoint
CREATE TYPE "payment_status" AS ENUM('pending', 'approved', 'rejected', 'refunded', 'cancelled');--> statement-breakpoint
CREATE TYPE "review_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "brazilian_state" AS ENUM('AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL UNIQUE,
	"ip_address" text,
	"user_agent" text,
	"impersonated_by" text,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean NOT NULL,
	"image" text,
	"role" "user_role" DEFAULT 'user'::"user_role" NOT NULL,
	"banned" boolean DEFAULT false NOT NULL,
	"ban_reason" text,
	"ban_expires" timestamp,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"slug" text NOT NULL UNIQUE,
	"description" text,
	"logo_s3_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "category" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"slug" text NOT NULL UNIQUE,
	"description" text,
	"parent_id" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"slug" text NOT NULL UNIQUE,
	"description" text NOT NULL,
	"brand_id" text NOT NULL,
	"category_id" text NOT NULL,
	"status" "product_status" DEFAULT 'draft'::"product_status" NOT NULL,
	"rating_average" integer DEFAULT 0 NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"search_vector" tsvector GENERATED ALWAYS AS (to_tsvector('portuguese', "product"."name" || ' ' || "product"."description")) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_image" (
	"id" text PRIMARY KEY,
	"product_id" text NOT NULL,
	"variant_id" text,
	"s3_key" text NOT NULL,
	"alt_text" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_specification" (
	"id" text PRIMARY KEY,
	"product_id" text NOT NULL,
	"label" text NOT NULL,
	"value" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_variant" (
	"id" text PRIMARY KEY,
	"product_id" text NOT NULL,
	"name" text NOT NULL,
	"sku" text NOT NULL UNIQUE,
	"price_amount" integer NOT NULL,
	"compare_at_price_amount" integer,
	"stock_quantity" integer DEFAULT 0 NOT NULL,
	"weight_grams" integer NOT NULL,
	"length_mm" integer NOT NULL,
	"width_mm" integer NOT NULL,
	"height_mm" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_variant_stock_non_negative" CHECK ("stock_quantity" >= 0),
	CONSTRAINT "product_variant_price_positive" CHECK ("price_amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "cart" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL UNIQUE,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cart_item" (
	"id" text PRIMARY KEY,
	"cart_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cart_item_quantity_positive" CHECK ("quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "coupon" (
	"id" text PRIMARY KEY,
	"code" text NOT NULL UNIQUE,
	"type" "coupon_type" NOT NULL,
	"value" integer DEFAULT 0 NOT NULL,
	"min_order_amount" integer,
	"max_uses" integer,
	"max_uses_per_user" integer,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coupon_window_ordered" CHECK ("ends_at" > "starts_at")
);
--> statement-breakpoint
CREATE TABLE "coupon_redemption" (
	"id" text PRIMARY KEY,
	"coupon_id" text NOT NULL,
	"user_id" text NOT NULL,
	"order_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order" (
	"id" text PRIMARY KEY,
	"number" integer GENERATED ALWAYS AS IDENTITY (sequence name "order_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1000 CACHE 1),
	"user_id" text NOT NULL,
	"status" "order_status" DEFAULT 'pending_payment'::"order_status" NOT NULL,
	"customer_name" text NOT NULL,
	"customer_email" text NOT NULL,
	"customer_document" text NOT NULL,
	"shipping_recipient_name" text NOT NULL,
	"shipping_postal_code" text NOT NULL,
	"shipping_street" text NOT NULL,
	"shipping_number" text NOT NULL,
	"shipping_complement" text,
	"shipping_neighborhood" text NOT NULL,
	"shipping_city" text NOT NULL,
	"shipping_state" "brazilian_state" NOT NULL,
	"shipping_reference_point" text,
	"shipping_method_id" text,
	"shipping_method_name" text NOT NULL,
	"estimated_delivery_days" integer NOT NULL,
	"tracking_code" text,
	"shipped_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"subtotal_amount" integer NOT NULL,
	"discount_amount" integer DEFAULT 0 NOT NULL,
	"shipping_amount" integer NOT NULL,
	"total_amount" integer GENERATED ALWAYS AS ("order"."subtotal_amount" - "order"."discount_amount" + "order"."shipping_amount") STORED,
	"coupon_id" text,
	"coupon_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_item" (
	"id" text PRIMARY KEY,
	"order_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"product_name" text NOT NULL,
	"variant_name" text NOT NULL,
	"sku" text NOT NULL,
	"unit_price_amount" integer NOT NULL,
	"quantity" integer NOT NULL,
	"total_amount" integer GENERATED ALWAYS AS ("order_item"."unit_price_amount" * "order_item"."quantity") STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_item_quantity_positive" CHECK ("quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "order_status_history" (
	"id" text PRIMARY KEY,
	"order_id" text NOT NULL,
	"status" "order_status" NOT NULL,
	"note" text,
	"changed_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" text PRIMARY KEY,
	"order_id" text NOT NULL,
	"provider" text DEFAULT 'mercado_pago' NOT NULL,
	"provider_payment_id" text,
	"method" "payment_method" NOT NULL,
	"status" "payment_status" DEFAULT 'pending'::"payment_status" NOT NULL,
	"amount" integer NOT NULL,
	"paid_at" timestamp with time zone,
	"provider_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_webhook_event" (
	"id" text PRIMARY KEY,
	"provider" text DEFAULT 'mercado_pago' NOT NULL,
	"provider_event_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipping_method" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"carrier" text NOT NULL,
	"base_cost_amount" integer NOT NULL,
	"estimated_delivery_days" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review" (
	"id" text PRIMARY KEY,
	"product_id" text NOT NULL,
	"user_id" text NOT NULL,
	"order_id" text NOT NULL,
	"rating" integer NOT NULL,
	"title" text,
	"body" text NOT NULL,
	"status" "review_status" DEFAULT 'pending'::"review_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_rating_range" CHECK ("rating" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "address" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"recipient_name" text NOT NULL,
	"postal_code" text NOT NULL,
	"street" text NOT NULL,
	"number" text NOT NULL,
	"complement" text,
	"neighborhood" text NOT NULL,
	"city" text NOT NULL,
	"state" "brazilian_state" NOT NULL,
	"reference_point" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_profile" (
	"user_id" text PRIMARY KEY,
	"document" text NOT NULL UNIQUE,
	"phone" text NOT NULL,
	"birth_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wishlist_item" (
	"user_id" text,
	"variant_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wishlist_item_pkey" PRIMARY KEY("user_id","variant_id")
);
--> statement-breakpoint
CREATE INDEX "category_parent_idx" ON "category" ("parent_id");--> statement-breakpoint
CREATE INDEX "product_brand_idx" ON "product" ("brand_id");--> statement-breakpoint
CREATE INDEX "product_category_idx" ON "product" ("category_id");--> statement-breakpoint
CREATE INDEX "product_search_idx" ON "product" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "product_active_idx" ON "product" ("category_id") WHERE "status" = 'active';--> statement-breakpoint
CREATE INDEX "product_image_product_idx" ON "product_image" ("product_id");--> statement-breakpoint
CREATE INDEX "product_image_variant_idx" ON "product_image" ("variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_specification_label_unique" ON "product_specification" ("product_id","label");--> statement-breakpoint
CREATE INDEX "product_variant_product_idx" ON "product_variant" ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cart_item_variant_unique" ON "cart_item" ("cart_id","variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "coupon_redemption_order_unique" ON "coupon_redemption" ("coupon_id","order_id");--> statement-breakpoint
CREATE INDEX "coupon_redemption_user_idx" ON "coupon_redemption" ("coupon_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "order_number_unique" ON "order" ("number");--> statement-breakpoint
CREATE INDEX "order_user_idx" ON "order" ("user_id");--> statement-breakpoint
CREATE INDEX "order_status_idx" ON "order" ("status");--> statement-breakpoint
CREATE INDEX "order_item_order_idx" ON "order_item" ("order_id");--> statement-breakpoint
CREATE INDEX "order_status_history_order_idx" ON "order_status_history" ("order_id");--> statement-breakpoint
CREATE INDEX "payment_order_idx" ON "payment" ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_provider_id_unique" ON "payment" ("provider","provider_payment_id") WHERE "provider_payment_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_webhook_event_unique" ON "payment_webhook_event" ("provider","provider_event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "review_user_product_unique" ON "review" ("user_id","product_id");--> statement-breakpoint
CREATE INDEX "review_product_idx" ON "review" ("product_id") WHERE "status" = 'approved';--> statement-breakpoint
CREATE INDEX "address_user_idx" ON "address" ("user_id");--> statement-breakpoint
CREATE INDEX "wishlist_item_user_idx" ON "wishlist_item" ("user_id");--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_parent_id_category_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "category"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_brand_id_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brand"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_category_id_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "product_image" ADD CONSTRAINT "product_image_product_id_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "product_image" ADD CONSTRAINT "product_image_variant_id_product_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variant"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "product_specification" ADD CONSTRAINT "product_specification_product_id_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "product_variant" ADD CONSTRAINT "product_variant_product_id_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cart" ADD CONSTRAINT "cart_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_cart_id_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "cart"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_variant_id_product_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variant"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "coupon_redemption" ADD CONSTRAINT "coupon_redemption_coupon_id_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupon"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "coupon_redemption" ADD CONSTRAINT "coupon_redemption_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "coupon_redemption" ADD CONSTRAINT "coupon_redemption_order_id_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_shipping_method_id_shipping_method_id_fkey" FOREIGN KEY ("shipping_method_id") REFERENCES "shipping_method"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_coupon_id_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupon"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_order_id_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_variant_id_product_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variant"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_changed_by_user_id_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_order_id_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_product_id_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_order_id_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "address" ADD CONSTRAINT "address_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "customer_profile" ADD CONSTRAINT "customer_profile_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "wishlist_item" ADD CONSTRAINT "wishlist_item_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "wishlist_item" ADD CONSTRAINT "wishlist_item_variant_id_product_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variant"("id") ON DELETE CASCADE;