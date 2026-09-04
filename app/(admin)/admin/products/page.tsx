import { Suspense } from "react";
import { FilterBar } from "@/components/filter-bar";
import { requireAdmin } from "@/lib/auth-guards";
import { ProductTable } from "@/modules/products/admin/components/product-table";
import { ProductTableSkeleton } from "@/modules/products/admin/components/product-table-skeleton";
import { productFilters } from "@/modules/products/admin/constants";
import { parseProductListParams } from "@/modules/products/admin/schemas";
import { caller, HydrateClient, prefetch, trpc } from "@/trpc/server";

/**
 * The page types `searchParams` itself: Next's generated `PageProps` leaves it
 * as `Promise<any>`, and this is also the honest shape — every value is a
 * string, and `?status=a&status=b` is an array. It is what gives the ADR-0014
 * schema something to coerce.
 */
const AdminProductsPage = async ({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  await requireAdmin();

  // Parsed once, here, and passed down as a prop: the client feeds this exact
  // object into `queryOptions` and never derives its own, so the hydrated key
  // and the client's key cannot diverge (ADR-0011).
  const input = parseProductListParams(await searchParams);

  // Never awaited: awaiting would block the shell behind the data and give up
  // the streaming the Suspense boundary below exists for.
  prefetch(trpc.products.admin.list.queryOptions(input));

  // The route composing three modules — ADR-0008's rule 4. Through `caller`
  // because no client component reads either as a query: `FilterBar` takes
  // them as props, so hydrating them would ship a payload nothing reads. In
  // parallel because neither waits on the other.
  const [brands, categories] = await Promise.all([
    caller.brands.admin.options(),
    caller.categories.admin.options(),
  ]);

  return (
    <HydrateClient>
      <div className="group flex flex-col gap-6">
        <h1 className="text-2xl font-semibold">Produtos</h1>

        {/* Outside the Suspense boundary: the filter bar is part of the shell
            an Admin gets immediately, and a filter change must not replace the
            control that made it. */}
        <FilterBar
          filters={productFilters({ brands, categories })}
          input={input}
        />

        {/* A filter in flight dims the table it is about to change rather than
            flashing the skeleton back (`docs/DATA-FLOW.md`); the skeleton is
            the first paint only. `data-pending` is set by whichever control is
            navigating. */}
        <div className="transition-opacity group-has-data-pending:opacity-50">
          {/* Suspense is per data section and owned by the page. There is no
              loading.tsx under admin: it would replace this shell as well. */}
          <Suspense fallback={<ProductTableSkeleton />}>
            <ProductTable input={input} />
          </Suspense>
        </div>
      </div>
    </HydrateClient>
  );
};

export default AdminProductsPage;
