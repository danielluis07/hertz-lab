ALTER TABLE "brand" DROP CONSTRAINT "brand_slug_key";--> statement-breakpoint
ALTER TABLE "brand" DROP COLUMN "slug";--> statement-breakpoint
ALTER TABLE "brand" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "brand" DROP COLUMN "logo_s3_key";--> statement-breakpoint
CREATE UNIQUE INDEX "brand_name_unique_idx" ON "brand" (lower("name"));