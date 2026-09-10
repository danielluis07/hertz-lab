import type { Metadata } from "next";
import { Catalog } from "@/modules/products/shop/components/catalog";
import { parseCatalogParams } from "@/modules/products/shop/schemas";

export const metadata: Metadata = {
  title: "Produtos",
};

/**
 * Dynamic by construction: `searchParams` is a Request-time API (ADR-0035).
 * The page owns the input and the heading and nothing else — the reads are
 * `<Catalog>`'s, shared with the Category route (`docs/STOREFRONT.md`).
 *
 * The page types `searchParams` itself: Next's generated `PageProps` leaves it
 * as `Promise<any>`, and this is the honest shape the ADR-0014 schema coerces.
 */
const ProductsPage = async ({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  // Parsed once, here, and passed down as a prop (ADR-0011).
  const input = parseCatalogParams(await searchParams);

  return (
    <div className="group">
      <h1>{input.search ? `Resultados para "${input.search}"` : "Produtos"}</h1>
      <Catalog input={input} />
    </div>
  );
};

export default ProductsPage;
