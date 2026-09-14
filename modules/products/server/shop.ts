import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  gt,
  inArray,
  lte,
  ne,
  notInArray,
  sql,
  type SQL,
} from "drizzle-orm";
import type { PgSelect } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { brand, product, productImage, productVariant } from "@/db/schema";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { soldUnitsByVariant } from "@/modules/orders/server/sales";
import {
  CATALOG_PER_PAGE,
  HOME_PRODUCT_LIMIT,
  RELATED_PRODUCT_LIMIT,
} from "@/modules/products/shop/constants";
import {
  bestSellersInputSchema,
  CATALOG_SORTS,
  catalogListInputSchema,
  newestInputSchema,
  productBySlugInputSchema,
  relatedProductsInputSchema,
  topRatedInputSchema,
  type CatalogSortBy,
} from "@/modules/products/shop/schemas";
import type { ProductCardRow } from "@/modules/products/shop/types";
import {
  visibleProduct,
  visibleProductIn,
} from "@/modules/products/server/visibility";

/**
 * Each Product's Cover — its first Image in the Admin's order, a position and
 * never a flag (`CONTEXT.md`) — as one row per Product. Isolated before the
 * join so a Product's other photographs cannot multiply its Variant rows.
 *
 * Joined **inner** (ADR-0045): publishing an imageless Product is refused, so
 * a visible Product always has one, and a left join with a placeholder would
 * hide the bug the day that guarantee broke.
 */
const cover = db
  .selectDistinctOn([productImage.productId], {
    productId: productImage.productId,
    s3Key: productImage.s3Key,
    altText: productImage.altText,
  })
  .from(productImage)
  .orderBy(
    productImage.productId,
    asc(productImage.position),
    asc(productImage.id),
  )
  .as("cover");

/**
 * A Product's shop price: its lowest Variant's (ADR-0033). One expression for
 * the card, the price filter and both price sorts, so the grid is ordered by
 * the number it prints. An aggregate, which is why the range is a `HAVING`.
 *
 * Non-null: every Product has at least one Variant (`CONTEXT.md`), and the
 * Variant join is inner.
 */
const priceAmount = sql<number>`min(${productVariant.priceAmount})`;

/**
 * The struck-through price of the **same** Variant the minimum came from
 * (ADR-0033) — never an independent aggregate, which would print one
 * Variant's price beside another's saving.
 *
 * When several Variants share the minimum, the Admin's `position` and then the
 * id choose the price-driving row (#109), so the pair is deterministic. The
 * `array_agg` orders by price first, which makes its first element exactly the
 * row `min` found.
 */
const compareAtPriceAmount = sql<number | null>`(array_agg(${productVariant.compareAtPriceAmount} order by ${productVariant.priceAmount}, ${productVariant.position}, ${productVariant.id}))[1]`;

/**
 * The card's _A partir de_ test is `variantCount > 1` (ADR-0045): the minimum
 * gives the number and not the label.
 */
const variantCount = count(productVariant.id);

/**
 * The price-driving Variant's relative reduction, `0` where it has none. A
 * compare-at at or below the price is no saving, so it ranks with none.
 */
const discount = sql`case when ${compareAtPriceAmount} > ${priceAmount} then (${compareAtPriceAmount} - ${priceAmount})::numeric / ${compareAtPriceAmount} else 0 end`;

/**
 * Units sold per Product (ADR-0047): the Orders module's per-Variant relation
 * joined to Variants and folded to one row per Product **before** the
 * catalogue's joins, so neither Images nor the Variant join can multiply a
 * total, and with no `LIMIT` ahead of the fold. Nothing here names an Order
 * table, status or quantity — `soldUnitsByVariant()` is the whole of the sales
 * vocabulary that crosses.
 *
 * Unexecuted, like the relation it wraps; `list` joins it only for the sort
 * that reads it.
 */
const productSales = (() => {
  const sold = soldUnitsByVariant();

  return db
    .select({
      productId: productVariant.productId,
      unitsSold: sql<string>`sum(${sold.unitsSold})`.as("units_sold"),
    })
    .from(productVariant)
    .innerJoin(sold, eq(sold.variantId, productVariant.id))
    .groupBy(productVariant.productId)
    .as("product_sales");
})();

/**
 * The joins every catalogue row stands on — its Brand, its Cover and its
 * Variants — shared by the page and its count, so the set the count measures
 * cannot drift from the set the pages are cut from. All three are inner: the
 * Brand key is `notNull` with `restrict`, every Product has a Variant, and a
 * visible Product always has a Cover (ADR-0045).
 */
function fromCardRows<TQuery extends PgSelect>(query: TQuery) {
  return query
    .innerJoin(brand, eq(brand.id, product.brandId))
    .innerJoin(cover, eq(cover.productId, product.id))
    .innerJoin(productVariant, eq(productVariant.productId, product.id));
}

/** The exact shared projection consumed by every Product card surface. */
const productCardSelection = {
  id: product.id,
  slug: product.slug,
  name: product.name,
  brandName: brand.name,
  coverS3Key: cover.s3Key,
  coverAltText: cover.altText,
  priceAmount,
  compareAtPriceAmount,
  variantCount,
};

/** The grouping required by the shared card projection's aggregate fields. */
const PRODUCT_CARD_GROUP = [
  product.id,
  brand.id,
  cover.s3Key,
  cover.altText,
] as const;

function excludeProducts(productIds: string[]): SQL | undefined {
  return productIds.length > 0
    ? notInArray(product.id, productIds)
    : undefined;
}

/** The meaningful tie on every ranking prefers the newer Product; the id makes the order total. */
const NEWEST_THEN_ID = [desc(product.createdAt), asc(product.id)];

/**
 * The `ORDER BY` behind each `?ordenar=`, tie-breaks included, so no two
 * Products compare equal and none crosses a page boundary between requests.
 * A predicate that exists only as SQL is not a pure rule (`docs/MODULES.md`),
 * so this lives with its query.
 */
function catalogOrder(
  sortBy: CatalogSortBy,
  direction: typeof asc,
  matches: SQL | undefined,
): SQL[] {
  switch (sortBy) {
    case "relevance":
      // The schema offers _relevância_ only beside a search; without one
      // there is nothing to rank, and recency is the default it resolves to.
      return matches
        ? [direction(sql`ts_rank(${product.searchVector}, ${matches})`), ...NEWEST_THEN_ID]
        : NEWEST_THEN_ID;
    case "createdAt":
      return [direction(product.createdAt), asc(product.id)];
    case "price":
      return [direction(priceAmount), ...NEWEST_THEN_ID];
    case "ratingAverage":
      // `rating_average` is 0 for every unreviewed Product (ADR-0004), so on a
      // young catalogue this buries them. That is correct, and it is the sort
      // that looks broken first.
      return [
        direction(product.ratingAverage),
        direction(product.ratingCount),
        ...NEWEST_THEN_ID,
      ];
    case "discount":
      return [direction(discount), ...NEWEST_THEN_ID];
    case "unitsSold":
      // A Product that never sold scores 0 and stays in the result: a sort
      // never becomes a filter, so `total` does not change with it.
      return [
        direction(sql`coalesce(${productSales.unitsSold}, 0)`),
        ...NEWEST_THEN_ID,
      ];
  }
}

export const shopRouter = createTRPCRouter({
  /**
   * The product page's projection of one active Product, or `null` for every
   * other state — unknown, draft and archived are the same absence, and the
   * page turns it into `notFound()` (ADR-0041).
   *
   * **One relational query**, ordering Variants, Images and Specifications by
   * `position` inside it: the array order *is* the position contract, so the
   * numbers themselves are not returned. The id breaks a position tie, so two
   * renders cannot disagree about which Variant is first.
   *
   * Only what the page renders crosses: no SKU, freight dimensions, timestamps
   * or search vector. Brand and Category are references outside the Aggregate
   * (`CONTEXT.md`); their names are read here because the page shows them, and
   * the Category carries its parent so the breadcrumb can build the canonical
   * path ADR-0043 defines (ADR-0053).
   */
  bySlug: baseProcedure
    .input(productBySlugInputSchema)
    .query(async ({ input }) => {
      const row = await db.query.product.findFirst({
        columns: {
          id: true,
          slug: true,
          name: true,
          description: true,
          categoryId: true,
          ratingAverage: true,
          ratingCount: true,
        },
        where: {
          slug: input.slug,
          RAW: (table) => visibleProductIn(table),
        },
        with: {
          brand: { columns: { name: true } },
          category: {
            columns: { name: true, slug: true },
            with: { parent: { columns: { name: true, slug: true } } },
          },
          variants: {
            columns: {
              id: true,
              name: true,
              priceAmount: true,
              compareAtPriceAmount: true,
              stockQuantity: true,
            },
            orderBy: { position: "asc", id: "asc" },
          },
          images: {
            columns: {
              id: true,
              variantId: true,
              s3Key: true,
              altText: true,
            },
            orderBy: { position: "asc", id: "asc" },
          },
          specifications: {
            columns: { id: true, label: true, value: true },
            orderBy: { position: "asc", id: "asc" },
          },
        },
      });

      if (!row) return null;

      const { brand: productBrand, category: productCategory, ...fields } = row;

      return {
        ...fields,
        brandName: productBrand.name,
        category: {
          name: productCategory.name,
          slug: productCategory.slug,
          // Both null for a root: the tree is two levels deep (ADR-0022), so
          // a parent is always a root and has no parent of its own to carry.
          parentSlug: productCategory.parent?.slug ?? null,
          parentName: productCategory.parent?.name ?? null,
        },
      };
    }),

  /**
   * Up to four other active Products filed on **exactly** this Category, as
   * the shared `ProductCardRow` (ADR-0045), newest first.
   *
   * Deliberately plain: no descendant Categories, no Brand fallback, no
   * personalisation or shuffling, and a short result is not padded. The id
   * makes the order total, so a cached page and its regeneration agree.
   */
  related: baseProcedure
    .input(relatedProductsInputSchema)
    .query(async ({ input }) => {
      const rows = await fromCardRows(
        db.select(productCardSelection).from(product).$dynamic(),
      )
        .where(
          and(
            visibleProduct,
            eq(product.categoryId, input.categoryId),
            ne(product.id, input.productId),
          ),
        )
        .groupBy(...PRODUCT_CARD_GROUP)
        .orderBy(desc(product.createdAt), desc(product.id))
        .limit(RELATED_PRODUCT_LIMIT);

      const items: ProductCardRow[] = rows;
      return items;
    }),

  /**
   * Active Products whose price-driving Variant carries a real saving.
   * Relative reduction ranks before recency and stable Product identity.
   */
  promotions: baseProcedure.query(async () => {
    const rows = await fromCardRows(
      db.select(productCardSelection).from(product).$dynamic(),
    )
      .where(visibleProduct)
      .groupBy(...PRODUCT_CARD_GROUP)
      .having(gt(compareAtPriceAmount, priceAmount))
      .orderBy(desc(discount), ...NEWEST_THEN_ID)
      .limit(HOME_PRODUCT_LIMIT);

    const items: ProductCardRow[] = rows;
    return items;
  }),

  /**
   * Active Products with positive lifetime sold units. The Product aggregate
   * is complete before the Cover and Variant joins used by the card row.
   */
  bestSellers: baseProcedure
    .input(bestSellersInputSchema)
    .query(async ({ input }) => {
      const rows = await fromCardRows(
        db.select(productCardSelection).from(product).$dynamic(),
      )
        .innerJoin(productSales, eq(productSales.productId, product.id))
        .where(
          and(
            visibleProduct,
            excludeProducts(input.excludeProductIds),
          ),
        )
        .groupBy(...PRODUCT_CARD_GROUP, productSales.unitsSold)
        .orderBy(desc(productSales.unitsSold), ...NEWEST_THEN_ID)
        .limit(HOME_PRODUCT_LIMIT);

      const items: ProductCardRow[] = rows;
      return items;
    }),

  /** Active Products by recency, excluding every earlier preview first. */
  newest: baseProcedure
    .input(newestInputSchema)
    .query(async ({ input }) => {
      const rows = await fromCardRows(
        db.select(productCardSelection).from(product).$dynamic(),
      )
        .where(
          and(
            visibleProduct,
            excludeProducts(input.excludeProductIds),
          ),
        )
        .groupBy(...PRODUCT_CARD_GROUP)
        .orderBy(...NEWEST_THEN_ID)
        .limit(HOME_PRODUCT_LIMIT);

      const items: ProductCardRow[] = rows;
      return items;
    }),

  /** Approved-review Products by rating, count, recency and stable identity. */
  topRated: baseProcedure
    .input(topRatedInputSchema)
    .query(async ({ input }) => {
      const rows = await fromCardRows(
        db.select(productCardSelection).from(product).$dynamic(),
      )
        .where(
          and(
            visibleProduct,
            gt(product.ratingCount, 0),
            excludeProducts(input.excludeProductIds),
          ),
        )
        .groupBy(...PRODUCT_CARD_GROUP)
        .orderBy(
          desc(product.ratingAverage),
          desc(product.ratingCount),
          ...NEWEST_THEN_ID,
        )
        .limit(HOME_PRODUCT_LIMIT);

      const items: ProductCardRow[] = rows;
      return items;
    }),

  /**
   * The catalogue: visible Products as `ProductCardRow`s (ADR-0045), one page
   * of `CATALOG_PER_PAGE` at a time, with the `total` `PaginationNav` needs.
   *
   * Grouped by Product because price is an aggregate over Variants
   * (ADR-0033) — which puts the price range and the promotion filter in a
   * `HAVING`, and makes the admin's flat `count()` unavailable: `total`
   * counts the grouped query as a subquery instead.
   *
   * A list always succeeds. A filter matching nothing, a contradictory range
   * and `?pagina=999` are all an empty page, never a 404 (ADR-0041).
   */
  list: baseProcedure
    .input(catalogListInputSchema)
    .query(async ({ input }) => {
      // `plainto_tsquery` ands whatever a shopper typed and cannot be a syntax
      // error; the match and the rank read the same expression over
      // `product_search_idx`.
      const matches = input.search
        ? sql`plainto_tsquery('portuguese', ${input.search})`
        : undefined;

      const where = and(
        visibleProduct,
        matches ? sql`${product.searchVector} @@ ${matches}` : undefined,
        input.brandId ? eq(product.brandId, input.brandId) : undefined,
        // A Category page's subtree, already sorted by the schema (ADR-0043).
        input.categoryIds
          ? inArray(product.categoryId, input.categoryIds)
          : undefined,
      );

      const having = and(
        input.priceMin === undefined
          ? undefined
          : gte(priceAmount, input.priceMin),
        input.priceMax === undefined
          ? undefined
          : lte(priceAmount, input.priceMax),
        // The price-driving Variant carries a saving, so every card in the
        // result can show the promotion it was selected for.
        input.promotion
          ? sql`${compareAtPriceAmount} > ${priceAmount}`
          : undefined,
      );

      const { sortBy, sortOrder } = CATALOG_SORTS[input.sort];
      const bySales = sortBy === "unitsSold";

      let cards = fromCardRows(
        db
          .select(productCardSelection)
          .from(product)
          .$dynamic(),
      );

      // The lifetime sales aggregate is real database work, so only the sort
      // that reads it pays for it. A left join: unsold Products stay.
      if (bySales) {
        cards = cards.leftJoin(
          productSales,
          eq(productSales.productId, product.id),
        );
      }

      const page = cards
        .where(where)
        .groupBy(
          ...PRODUCT_CARD_GROUP,
          ...(bySales ? [productSales.unitsSold] : []),
        )
        .having(having)
        .orderBy(
          ...catalogOrder(sortBy, sortOrder === "asc" ? asc : desc, matches),
        )
        .limit(CATALOG_PER_PAGE)
        .offset((input.page - 1) * CATALOG_PER_PAGE);

      // The same joins, predicates and grouping as the page. The sales join is
      // absent because a left join cannot change the set being counted.
      const matching = fromCardRows(
        db.select({ id: product.id }).from(product).$dynamic(),
      )
        .where(where)
        .groupBy(product.id)
        .having(having)
        .as("matching");

      const total = db.select({ value: count() }).from(matching);

      const [rows, [totalRow]] = await Promise.all([page, total]);

      // Assigned to the declared row, so this read is held to the contract
      // every card read shares (ADR-0045).
      const items: ProductCardRow[] = rows;

      return { items, total: totalRow?.value ?? 0 };
    }),
});
