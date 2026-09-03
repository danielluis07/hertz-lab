/**
 * PROTOTYPE — throwaway. See `README.md` in this folder.
 *
 * In-memory stand-ins for what `trpc.<module>.admin.list` will return. No
 * database, no tRPC: the question under test is how a surface is *authored*,
 * and ADR-0010 already settled how it reaches the data.
 */

export type BrandRow = {
  id: string;
  name: string;
  slug: string;
  productCount: number;
  createdAt: Date;
};

export type ProductRow = {
  id: string;
  name: string;
  slug: string;
  brandName: string;
  categoryName: string;
  status: "draft" | "active" | "archived";
  ratingAverage: number;
  ratingCount: number;
  variantCount: number;
  thumbnailS3Key: string | null;
  createdAt: Date;
};

const BRAND_NAMES = [
  "Sony", "Sennheiser", "JBL", "Audio-Technica", "Beyerdynamic", "AKG",
  "Shure", "Bose", "Focal", "HIFIMAN", "Grado", "Koss", "Philips", "Edifier",
  "Logitech", "Razer", "SteelSeries", "HyperX", "Marshall", "Bang & Olufsen",
  "Denon", "Yamaha", "Pioneer", "KEF", "Klipsch", "Polk Audio", "Anker",
  "Skullcandy",
];

const CATEGORIES = [
  { id: "cat-fones", name: "Fones de ouvido" },
  { id: "cat-caixas", name: "Caixas de som" },
  { id: "cat-interfaces", name: "Interfaces de áudio" },
  { id: "cat-cabos", name: "Cabos e adaptadores" },
  { id: "cat-microfones", name: "Microfones" },
];

const STATUSES = ["draft", "active", "archived"] as const;

const PRODUCT_NOUNS = [
  "Fone Over-Ear", "Fone In-Ear", "Caixa Bluetooth", "Interface USB",
  "Microfone Condensador", "Cabo P2", "Soundbar", "Monitor de Estúdio",
  "Fone Gamer", "Amplificador",
];

/** A fixed seed so a reload does not reshuffle the table under you. */
const seeded = (n: number) => (Math.sin(n * 12.9898) * 43758.5453) % 1;
const pick = <T,>(list: readonly T[], n: number) =>
  list[Math.floor(Math.abs(seeded(n)) * list.length) % list.length]!;

const DAY = 24 * 60 * 60 * 1000;
const EPOCH = new Date("2026-09-03T12:00:00Z").getTime();

export const BRANDS: BrandRow[] = BRAND_NAMES.map((name, i) => ({
  id: `brand-${i + 1}`,
  name,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  productCount: Math.floor(Math.abs(seeded(i + 100)) * 40),
  createdAt: new Date(EPOCH - (i * 9 + 3) * DAY),
}));

export const PRODUCTS: ProductRow[] = Array.from({ length: 64 }, (_, i) => {
  const brand = BRANDS[Math.floor(Math.abs(seeded(i + 7)) * BRANDS.length)]!;
  const category = pick(CATEGORIES, i + 31);
  const noun = pick(PRODUCT_NOUNS, i + 53);
  const name = `${noun} ${brand.name} ${900 + i}`;
  const ratingCount = Math.floor(Math.abs(seeded(i + 211)) * 180);

  return {
    id: `product-${i + 1}`,
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    brandName: brand.name,
    categoryName: category.name,
    status: pick(STATUSES, i + 17),
    // Hundredths, per the schema: 450 means 4,50.
    ratingAverage: ratingCount === 0 ? 0 : 200 + Math.floor(Math.abs(seeded(i + 89)) * 300),
    ratingCount,
    variantCount: 1 + Math.floor(Math.abs(seeded(i + 137)) * 4),
    thumbnailS3Key: i % 9 === 0 ? null : `products/${i + 1}/cover.jpg`,
    createdAt: new Date(EPOCH - (i * 3 + 1) * DAY),
  };
});

export const BRAND_OPTIONS = BRANDS.map((b) => ({ value: b.id, label: b.name }));
export const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({
  value: c.id,
  label: c.name,
}));

/** The category a product belongs to, by id — fixtures store the name only. */
const categoryIdByName = new Map(CATEGORIES.map((c) => [c.name, c.id]));
const brandIdByName = new Map(BRANDS.map((b) => [b.name, b.id]));

type Sorted<T> = { rows: T[]; total: number };

const compare = (a: string | number | Date, b: string | number | Date) =>
  a instanceof Date && b instanceof Date
    ? a.getTime() - b.getTime()
    : typeof a === "string" && typeof b === "string"
      ? a.localeCompare(b, "pt-BR")
      : Number(a) - Number(b);

function paginate<T>(rows: T[], page: number, perPage: number): Sorted<T> {
  const start = (page - 1) * perPage;
  return { rows: rows.slice(start, start + perPage), total: rows.length };
}

export function queryBrands(input: {
  search?: string;
  sortBy: "name" | "productCount" | "createdAt";
  sortOrder: "asc" | "desc";
  page: number;
  perPage: number;
}): Sorted<BrandRow> {
  const term = input.search?.toLowerCase();
  const filtered = BRANDS.filter(
    (b) => !term || b.name.toLowerCase().includes(term),
  );
  const sorted = [...filtered].sort(
    (a, b) =>
      compare(a[input.sortBy], b[input.sortBy]) *
      (input.sortOrder === "asc" ? 1 : -1),
  );
  return paginate(sorted, input.page, input.perPage);
}

export function queryProducts(input: {
  search?: string;
  status?: "draft" | "active" | "archived";
  categoryId?: string;
  brandId?: string;
  sortBy: "name" | "ratingAverage" | "createdAt";
  sortOrder: "asc" | "desc";
  page: number;
  perPage: number;
}): Sorted<ProductRow> {
  const term = input.search?.toLowerCase();
  const filtered = PRODUCTS.filter((p) => {
    if (term && !p.name.toLowerCase().includes(term)) return false;
    if (input.status && p.status !== input.status) return false;
    if (input.categoryId && categoryIdByName.get(p.categoryName) !== input.categoryId)
      return false;
    if (input.brandId && brandIdByName.get(p.brandName) !== input.brandId)
      return false;
    return true;
  });
  const sorted = [...filtered].sort(
    (a, b) =>
      compare(a[input.sortBy], b[input.sortBy]) *
      (input.sortOrder === "asc" ? 1 : -1),
  );
  return paginate(sorted, input.page, input.perPage);
}
