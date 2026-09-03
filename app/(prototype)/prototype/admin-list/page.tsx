/**
 * PROTOTYPE — throwaway. Issue #11: do admin surfaces share a kit, or only
 * conventions and a few primitives?
 *
 *   bun dev  ->  http://localhost:3000/prototype/admin-list
 *
 * Outside `(admin)` on purpose, so `requireAdmin()` never fires and the
 * prototype opens without a seeded Admin. No database, no tRPC: the input
 * schema (ADR-0014) and the fixture query are shared by both shapes, so the
 * only variable is how a surface is authored.
 */

import { Suspense } from "react";
import { queryBrands, queryProducts } from "./fixtures";
import {
  BRANDS_PER_PAGE,
  PRODUCTS_PER_PAGE,
  parseBrandListParams,
  parseProductListParams,
  type SearchParams,
} from "./params";
import { KitBrandsList } from "./kit/brands.resource";
import { KitProductsList } from "./kit/products.resource";
import { PrimitivesBrandsList } from "./primitives/brands-list";
import { PrimitivesProductsList } from "./primitives/products-list";
import { PrototypeBar } from "./prototype-bar";
import { readSources, SourcePanel } from "./source";

const PATHNAME = "/prototype/admin-list";

const KIT_SHARED = [
  "kit/resource.ts",
  "kit/resource-list.tsx",
  "kit/use-resource-filters.ts",
];

const PRIMITIVES_SHARED = [
  "primitives/data-table.tsx",
  "primitives/filter-bar.tsx",
];

const PER_SURFACE = {
  kit: {
    brands: ["kit/brands.resource.tsx"],
    products: ["kit/products.resource.tsx"],
  },
  primitives: {
    brands: ["primitives/brands-list.tsx"],
    products: ["primitives/products-list.tsx"],
  },
} as const;

export default async function AdminListPrototypePage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const searchParams = await props.searchParams;

  const shape = searchParams.shape === "kit" ? "kit" : "primitives";
  const surface = searchParams.surface === "products" ? "products" : "brands";

  // `?source=off` renders the surface alone. The source panel puts every file's
  // text into the RSC payload, which would swamp any measurement of what the
  // *table* costs to send.
  const showSource = searchParams.source !== "off";

  // What the page would pass to `prefetch(...)` in real code.
  const urlParams = new URLSearchParams(
    Object.entries(searchParams).flatMap(([key, value]) =>
      typeof value === "string" ? [[key, value] as [string, string]] : [],
    ),
  );

  const [perSurface, shared] = showSource
    ? await Promise.all([
        readSources([...PER_SURFACE[shape][surface]]),
        readSources(shape === "kit" ? KIT_SHARED : PRIMITIVES_SHARED),
      ])
    : [[], []];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 p-6 pb-28">
      <Suspense>
        {surface === "brands" ? (
          <BrandsSurface
            shape={shape}
            searchParams={searchParams}
            urlParams={urlParams}
          />
        ) : (
          <ProductsSurface
            shape={shape}
            searchParams={searchParams}
            urlParams={urlParams}
          />
        )}
      </Suspense>

      {showSource && (
        <div className="flex flex-col gap-6 border-t pt-6">
          <p className="text-sm text-muted-foreground">
            Both shapes render the same table. What differs is below: what the
            surface&apos;s author had to write, and what the shape charges for
            it.
          </p>
          <SourcePanel
            open
            title="Written per surface"
            subtitle="paid once per module, eight times over"
            files={perSurface}
          />
          <SourcePanel
            title="Written once, shared"
            subtitle="paid once, ever"
            files={shared}
          />
        </div>
      )}

      <PrototypeBar shape={shape} surface={surface} />
    </div>
  );
}

async function BrandsSurface({
  shape,
  searchParams,
  urlParams,
}: {
  shape: "kit" | "primitives";
  searchParams: SearchParams;
  urlParams: URLSearchParams;
}) {
  const input = parseBrandListParams(searchParams);
  const { rows, total } = queryBrands({ ...input, perPage: BRANDS_PER_PAGE });

  return shape === "kit" ? (
    <KitBrandsList rows={rows} total={total} input={input} />
  ) : (
    <PrimitivesBrandsList
      rows={rows}
      total={total}
      input={input}
      pathname={PATHNAME}
      searchParams={urlParams}
    />
  );
}

async function ProductsSurface({
  shape,
  searchParams,
  urlParams,
}: {
  shape: "kit" | "primitives";
  searchParams: SearchParams;
  urlParams: URLSearchParams;
}) {
  const input = parseProductListParams(searchParams);
  const { rows, total } = queryProducts({
    ...input,
    perPage: PRODUCTS_PER_PAGE,
  });

  return shape === "kit" ? (
    <KitProductsList rows={rows} total={total} input={input} />
  ) : (
    <PrimitivesProductsList
      rows={rows}
      total={total}
      input={input}
      pathname={PATHNAME}
      searchParams={urlParams}
    />
  );
}
