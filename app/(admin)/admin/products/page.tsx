import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth-guards";
import { ProductTable } from "@/modules/products/admin/components/product-table";
import { ProductTableSkeleton } from "@/modules/products/admin/components/product-table-skeleton";
import { parseProductListParams } from "@/modules/products/admin/schemas";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

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

  return (
    <HydrateClient>
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold">Produtos</h1>

        {/* Suspense is per data section and owned by the page. There is no
            loading.tsx under admin: it would replace this shell as well. */}
        <Suspense fallback={<ProductTableSkeleton />}>
          <ProductTable input={input} />
        </Suspense>
      </div>
    </HydrateClient>
  );
};

export default AdminProductsPage;
