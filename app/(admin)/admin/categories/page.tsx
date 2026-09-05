import { Suspense } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth-guards";
import { CategoryTable } from "@/modules/categories/admin/components/category-table";
import { CategoryTableSkeleton } from "@/modules/categories/admin/components/category-table-skeleton";
import { parseCategoryListParams } from "@/modules/categories/admin/schemas";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

/**
 * The page types `searchParams` itself: Next's generated `PageProps` leaves it
 * as `Promise<any>`, and this is also the honest shape — every value is a
 * string, and `?sortBy=a&sortBy=b` is an array. It is what gives the ADR-0014
 * schema something to coerce.
 */
const AdminCategoriesPage = async ({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  await requireAdmin();

  // Parsed once, here, and passed down as a prop: the table feeds this exact
  // object into `queryOptions` and never derives its own, so the hydrated key
  // and the client's key cannot diverge (ADR-0011).
  const input = parseCategoryListParams(await searchParams);

  // Never awaited: awaiting would block the shell behind the data and give up
  // the streaming the Suspense boundary below exists for. `prefetch` rather
  // than `caller` because the table reads this query itself.
  prefetch(trpc.categories.admin.list.queryOptions(input));

  return (
    <HydrateClient>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Categorias</h1>

          <Link
            href="/admin/categories/new"
            className={buttonVariants({ size: "sm" })}>
            Nova categoria
          </Link>
        </div>

        {/* Suspense is per data section and owned by the page. There is no
            loading.tsx under admin: it would replace this shell as well.

            The skeleton is the first paint only. There is no `data-pending`
            dimming wrapper as on the products page: that attribute is
            `FilterBar`'s, set around the `router.replace` it fires, and this
            list has no filter bar (#56). A sort is a `Link`, and Next runs a
            link navigation in a transition — so the table stays on screen
            while the next order is fetched, and this boundary is never
            re-entered after the first paint. */}
        <Suspense fallback={<CategoryTableSkeleton />}>
          <CategoryTable input={input} />
        </Suspense>
      </div>
    </HydrateClient>
  );
};

export default AdminCategoriesPage;
