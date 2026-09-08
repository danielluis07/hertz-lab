import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth-guards";
import { BrandTable } from "@/modules/brands/admin/components/brand-table";
import { BrandTableSkeleton } from "@/modules/brands/admin/components/brand-table-skeleton";
import { parseBrandListParams } from "@/modules/brands/admin/schemas";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

/**
 * The page types `searchParams` itself: Next's generated `PageProps` leaves it
 * as `Promise<any>`, and this is also the honest shape — every value is a
 * string, and `?sortBy=a&sortBy=b` is an array. It is what gives the ADR-0014
 * schema something to coerce.
 *
 * There is no "Nova marca" link beside the heading: a Brand's form opens in a
 * dialog rather than at a route (ADR-0026), so the button that opens it belongs
 * to the surface that owns the dialog, and it arrives with it.
 */
const AdminBrandsPage = async ({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  await requireAdmin();

  // Parsed once, here, and passed down as a prop: the table feeds this exact
  // object into `queryOptions` and never derives its own, so the hydrated key
  // and the client's key cannot diverge (ADR-0011).
  const input = parseBrandListParams(await searchParams);

  // Never awaited: awaiting would block the shell behind the data and give up
  // the streaming the Suspense boundary below exists for. `prefetch` rather
  // than `caller` because the table reads this query itself.
  prefetch(trpc.brands.admin.list.queryOptions(input));

  return (
    <HydrateClient>
      <div className="flex flex-col gap-6">
        {/* The page owns its heading (ADR-0015): the admin frame is authored
            global and knows shapes rather than which list this is, so there
            are no breadcrumbs here either. */}
        <h1 className="text-2xl font-semibold">Marcas</h1>

        {/* Suspense is per data section and owned by the page. There is no
            loading.tsx under admin: it would replace this shell as well.

            The skeleton is the first paint only. There is no `data-pending`
            dimming wrapper as on the products page: that attribute is
            `FilterBar`'s, set around the `router.replace` it fires, and this
            list has no filter bar (ADR-0025). A sort is a `Link`, and Next
            runs a link navigation in a transition — so the table stays on
            screen while the next order is fetched, and this boundary is never
            re-entered after the first paint. */}
        <Suspense fallback={<BrandTableSkeleton />}>
          <BrandTable input={input} />
        </Suspense>
      </div>
    </HydrateClient>
  );
};

export default AdminBrandsPage;
