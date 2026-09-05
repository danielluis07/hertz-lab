import { sql, type SQL } from "drizzle-orm";
import {
  type AnyPgColumn,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { id, timestamps, tsvector } from "@/db/schema/columns";

export const productStatusEnum = pgEnum("product_status", [
  "draft",
  "active",
  "archived",
]);

export const brand = pgTable("brand", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  /** S3 object key, never a URL: buckets and CDNs change, history should not. */
  logoS3Key: text("logo_s3_key"),
  ...timestamps(),
});

export const category = pgTable(
  "category",
  {
    id: id(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    parentId: text("parent_id").references((): AnyPgColumn => category.id, {
      onDelete: "set null",
    }),
    /**
     * The one picture a Category may carry: an S3 object key, never a URL, and
     * never inherited by a child Category. Decoration for the browse surfaces
     * — not an Image, which is a photograph of a Product (`CONTEXT.md`).
     *
     * **There is deliberately no alt-text column beside it** (ADR-0021). The
     * tile renders `alt=""` because it is a link already labelled by the
     * Category name, and describing the picture beside it makes a screen
     * reader say the same word twice. The asymmetry with
     * `product_image.alt_text` — `notNull` and refused empty — is the point:
     * that photograph is the only description a blind shopper gets of the
     * thing on offer.
     */
    imageS3Key: text("image_s3_key"),
    // There is deliberately no `position` column. `CONTEXT.md`: a Category has
    // "no inherent order", so the order of any list of them belongs to the
    // surface that renders it. The column existed anyway — `integer notNull
    // default 0` — and nothing ever wrote it, nothing read it, and every row
    // was 0; a column that does nothing is a trap for the next reader, who
    // will reasonably assume it works. The asymmetry with the `position` on
    // Images and Variants is the point: those *are* a position and never a
    // flag, curated by an Admin who drags the rows. Re-adding this one is a
    // single migration if the storefront ever wants a curated browse order
    // (#54).
    ...timestamps(),
  },
  (t) => [index("category_parent_idx").on(t.parentId)],
);

export const product = pgTable(
  "product",
  {
    id: id(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull(),
    brandId: text("brand_id")
      .notNull()
      .references(() => brand.id, { onDelete: "restrict" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => category.id, { onDelete: "restrict" }),
    status: productStatusEnum("status").notNull().default("draft"),
    /** Hundredths, so 450 means 4.50. Derived from reviews — see ADR-0004. */
    ratingAverage: integer("rating_average").notNull().default(0),
    ratingCount: integer("rating_count").notNull().default(0),
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      (): SQL =>
        sql`to_tsvector('portuguese', ${product.name} || ' ' || ${product.description})`,
    ),
    ...timestamps(),
  },
  (t) => [
    index("product_brand_idx").on(t.brandId),
    index("product_category_idx").on(t.categoryId),
    index("product_search_idx").using("gin", t.searchVector),
    // Every storefront query filters on this; archived rows are dead weight.
    index("product_active_idx")
      .on(t.categoryId)
      .where(sql`${t.status} = 'active'`),
  ],
);

/** The only sellable unit in the system. See ADR-0001. */
export const productVariant = pgTable(
  "product_variant",
  {
    id: id(),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    /** Distinguishes this variant from its siblings: "Preto", "2 m". */
    name: text("name").notNull(),
    sku: text("sku").notNull().unique(),
    /** BRL cents. */
    priceAmount: integer("price_amount").notNull(),
    /** BRL cents. The struck-through "de R$ X" price, when on offer. */
    compareAtPriceAmount: integer("compare_at_price_amount"),
    stockQuantity: integer("stock_quantity").notNull().default(0),
    // Freight is quoted on weight and dimensions by every carrier.
    weightGrams: integer("weight_grams").notNull(),
    lengthMm: integer("length_mm").notNull(),
    widthMm: integer("width_mm").notNull(),
    heightMm: integer("height_mm").notNull(),
    position: integer("position").notNull().default(0),
    ...timestamps(),
  },
  (t) => [
    index("product_variant_product_idx").on(t.productId),
    check("product_variant_stock_non_negative", sql`${t.stockQuantity} >= 0`),
    check("product_variant_price_positive", sql`${t.priceAmount} > 0`),
  ],
);

export const productImage = pgTable(
  "product_image",
  {
    id: id(),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    /** Null means the shot belongs to the Product, not to one Variant. */
    variantId: text("variant_id").references(() => productVariant.id, {
      onDelete: "set null",
    }),
    s3Key: text("s3_key").notNull(),
    /** pt-BR, for screen readers. */
    altText: text("alt_text").notNull(),
    position: integer("position").notNull().default(0),
    ...timestamps(),
  },
  (t) => [
    index("product_image_product_idx").on(t.productId),
    index("product_image_variant_idx").on(t.variantId),
  ],
);

export const productSpecification = pgTable(
  "product_specification",
  {
    id: id(),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    /** pt-BR: "Impedância". */
    label: text("label").notNull(),
    /** pt-BR: "32 Ω". */
    value: text("value").notNull(),
    position: integer("position").notNull().default(0),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("product_specification_label_unique").on(t.productId, t.label),
  ],
);
