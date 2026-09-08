/**
 * The shape of the catalog fixture in `db/seed/data.ts`.
 *
 * A seed row is not a database row: it names its Brand and its Category by
 * their human identity — the Brand's name, the Category's slug — because the
 * ids are UUIDv7s minted at insert time. `db/seed/index.ts` resolves them.
 */

export type SeedCategory = {
  name: string;
  description: string;
  /** Sub-categories. One level deep is all the fixture needs. */
  children?: SeedCategory[];
};

export type SeedVariant = {
  /** Distinguishes this variant from its siblings: "Preto", "2 m". */
  name: string;
  /** Appended to the product's `skuPrefix` to form the unique SKU. */
  skuSuffix: string;
  /** BRL cents. */
  priceAmount: number;
  /** BRL cents. The struck-through "de R$ X" price, when on offer. */
  compareAtPriceAmount?: number;
  stockQuantity: number;
  weightGrams: number;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
};

export type SeedSpecification = {
  /** pt-BR: "Impedância". */
  label: string;
  /** pt-BR: "32 Ω". */
  value: string;
};

export type SeedProduct = {
  name: string;
  /** Matches a name in `BRANDS`, case-insensitively. */
  brand: string;
  /** The slug of a Category in `CATEGORIES`, derived from its name. */
  categorySlug: string;
  description: string;
  status: "draft" | "active" | "archived";
  /** SKUs are `${skuPrefix}-${skuSuffix}`, so this must be unique. */
  skuPrefix: string;
  variants: SeedVariant[];
  specifications: SeedSpecification[];
};
