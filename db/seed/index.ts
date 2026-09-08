/**
 * Fills the catalog tables with the fixture in `db/seed/data.ts`.
 *
 *     bun run db:seed
 *
 * **Idempotent, and additive only.** A Brand is matched by its name
 * case-insensitively, a Category by its slug and a Product by its slug — the
 * same identities the database enforces as unique. What is already there is
 * left exactly as it is; only what is missing gets inserted. Nothing is
 * updated and nothing is deleted.
 *
 * That is not fastidiousness. `order_line` references a Variant with
 * `onDelete: "restrict"`, so a seed that wiped the catalog first would fail the
 * moment the database holds one order — and, if it did not, would silently
 * rewrite prices a shopper has already been charged. Re-run this as often as
 * you like.
 */

import { db } from "@/db";
import {
  brand,
  category,
  product,
  productImage,
  productSpecification,
  productVariant,
} from "@/db/schema";
import {
  BRANDS,
  CATEGORIES,
  CATEGORY_IMAGE_S3_KEY,
  PRODUCT_IMAGE_S3_KEY,
  PRODUCTS,
} from "@/db/seed/data";
import type { SeedCategory, SeedProduct } from "@/db/seed/types";
import { slugify } from "@/lib/utils/slug";

/**
 * A Category row with its id already minted. The ids come from this side
 * rather than from the column default because a child's `parent_id` has to
 * name its parent, and reading ids back after the insert only to match them up
 * by slug again would be the same work done twice.
 */
type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  parentId: string | null;
  imageS3Key: string;
};

/**
 * The tree flattened into rows, every parent ahead of its children. Order
 * matters: the insert runs in one statement, and Postgres checks the
 * self-reference on `parent_id` per row.
 */
function flattenCategories(
  nodes: SeedCategory[],
  parentId: string | null = null,
): CategoryRow[] {
  return nodes.flatMap((node) => {
    const row: CategoryRow = {
      id: Bun.randomUUIDv7(),
      name: node.name,
      slug: slugify(node.name),
      description: node.description,
      parentId,
      imageS3Key: CATEGORY_IMAGE_S3_KEY,
    };

    return [row, ...flattenCategories(node.children ?? [], row.id)];
  });
}

/**
 * What a screen reader says for the one picture a Product carries. The Product
 * name, because that is what the shopper is being shown; the Variant name
 * after it, because "Preto" and "Branco" are the difference between two
 * otherwise identical photographs.
 *
 * `product_image.alt_text` is `notNull` and refused empty for exactly this
 * reason (ADR-0021): the photograph is the only description a blind shopper
 * gets of the thing on offer, so a seed may not leave it blank either.
 */
function altText(productName: string, variantName?: string): string {
  return variantName
    ? `${productName}, versão ${variantName}, em foto de produto sobre fundo neutro`
    : `${productName} em foto de produto sobre fundo neutro`;
}

/** Inserts the Brands that are not there yet; returns lower(name) → id for all. */
async function seedBrands(): Promise<Map<string, string>> {
  const existing = await db.select({ id: brand.id, name: brand.name }).from(brand);
  const byName = new Map(
    existing.map((row) => [row.name.toLowerCase(), row.id]),
  );

  const missing = BRANDS.filter((name) => !byName.has(name.toLowerCase()));

  if (missing.length > 0) {
    const inserted = await db
      .insert(brand)
      .values(missing.map((name) => ({ name })))
      .returning({ id: brand.id, name: brand.name });

    for (const row of inserted) {
      byName.set(row.name.toLowerCase(), row.id);
    }
  }

  console.log(`Brands:     ${missing.length} inseridas, ${byName.size} no total`);

  return byName;
}

/** Inserts the Categories that are not there yet; returns slug → id for all. */
async function seedCategories(): Promise<Map<string, string>> {
  const existing = await db
    .select({ id: category.id, slug: category.slug })
    .from(category);
  const bySlug = new Map(existing.map((row) => [row.slug, row.id]));

  const missing = flattenCategories(CATEGORIES).filter(
    (row) => !bySlug.has(row.slug),
  );

  if (missing.length > 0) {
    // A missing child of an *existing* parent would carry a `parentId` this
    // run minted and never inserted. Point it at the row already in the
    // database instead, so a partially-seeded tree fills in rather than
    // failing the foreign key.
    const minted = new Set(missing.map((row) => row.id));
    const rows = missing.map((row) => ({
      ...row,
      parentId:
        row.parentId && !minted.has(row.parentId)
          ? (bySlug.get(parentSlugOf(row)) ?? null)
          : row.parentId,
    }));

    await db.insert(category).values(rows);

    for (const row of rows) {
      bySlug.set(row.slug, row.id);
    }
  }

  console.log(
    `Categorias: ${missing.length} inseridas, ${bySlug.size} no total`,
  );

  return bySlug;
}

/**
 * The slug of a row's parent in the fixture, for the re-pointing above. Looked
 * up in the fixture rather than carried on `CategoryRow`, because it is only
 * ever needed on the partial-tree path.
 */
function parentSlugOf(row: CategoryRow): string {
  const find = (nodes: SeedCategory[], parent: SeedCategory | null): string => {
    for (const node of nodes) {
      if (slugify(node.name) === row.slug) {
        return parent ? slugify(parent.name) : "";
      }

      const found = find(node.children ?? [], node);
      if (found) return found;
    }

    return "";
  };

  return find(CATEGORIES, null);
}

/**
 * Inserts one Product with its Variants, Images and Specifications, in a
 * transaction — a Product with no Variant is not sellable (ADR-0001), so the
 * five writes are one write or none.
 */
async function seedProduct(
  seed: SeedProduct,
  brandId: string,
  categoryId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(product)
      .values({
        name: seed.name,
        slug: slugify(seed.name),
        description: seed.description,
        brandId,
        categoryId,
        status: seed.status,
        // `rating_average` and `rating_count` are left at their defaults on
        // purpose. They are derived from reviews (ADR-0004); writing stars no
        // review backs would make the storefront lie.
      })
      .returning({ id: product.id });

    const productId = row!.id;

    const variants = await tx
      .insert(productVariant)
      .values(
        seed.variants.map((variant, position) => ({
          productId,
          name: variant.name,
          sku: `${seed.skuPrefix}-${variant.skuSuffix}`,
          priceAmount: variant.priceAmount,
          compareAtPriceAmount: variant.compareAtPriceAmount ?? null,
          stockQuantity: variant.stockQuantity,
          weightGrams: variant.weightGrams,
          lengthMm: variant.lengthMm,
          widthMm: variant.widthMm,
          heightMm: variant.heightMm,
          position,
        })),
      )
      .returning({ id: productVariant.id, name: productVariant.name });

    await tx.insert(productImage).values([
      // Position 0 belongs to the Product, not to one Variant — the shot the
      // grid tile and the search result show.
      {
        productId,
        variantId: null,
        s3Key: PRODUCT_IMAGE_S3_KEY,
        altText: altText(seed.name),
        position: 0,
      },
      ...variants.map((variant, index) => ({
        productId,
        variantId: variant.id,
        s3Key: PRODUCT_IMAGE_S3_KEY,
        altText: altText(seed.name, variant.name),
        position: index + 1,
      })),
    ]);

    if (seed.specifications.length > 0) {
      await tx.insert(productSpecification).values(
        seed.specifications.map((specification, position) => ({
          productId,
          label: specification.label,
          value: specification.value,
          position,
        })),
      );
    }
  });
}

async function seedProducts(
  brandsByName: Map<string, string>,
  categoriesBySlug: Map<string, string>,
): Promise<void> {
  const existing = await db.select({ slug: product.slug }).from(product);
  const existingSlugs = new Set(existing.map((row) => row.slug));

  let inserted = 0;

  for (const seed of PRODUCTS) {
    if (existingSlugs.has(slugify(seed.name))) continue;

    const brandId = brandsByName.get(seed.brand.toLowerCase());
    const categoryId = categoriesBySlug.get(seed.categorySlug);

    // A fixture that names a Brand or a Category it never declares is a typo
    // in `data.ts`, not a runtime condition. Say which row and which name, and
    // stop — a half-seeded catalog is harder to reason about than none.
    if (!brandId) {
      throw new Error(`"${seed.name}": marca desconhecida "${seed.brand}".`);
    }

    if (!categoryId) {
      throw new Error(
        `"${seed.name}": categoria desconhecida "${seed.categorySlug}".`,
      );
    }

    await seedProduct(seed, brandId, categoryId);
    inserted += 1;
  }

  console.log(
    `Produtos:   ${inserted} inseridos, ${existingSlugs.size + inserted} no total`,
  );
}

async function main(): Promise<void> {
  const brandsByName = await seedBrands();
  const categoriesBySlug = await seedCategories();
  await seedProducts(brandsByName, categoriesBySlug);

  console.log("Seed concluído.");
}

await main();

// The Neon pool keeps a socket open, so the process would hang on an otherwise
// finished script.
process.exit(0);
