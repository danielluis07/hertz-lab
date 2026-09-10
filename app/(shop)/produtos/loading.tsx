import { Skeleton } from "@/components/ui/skeleton";
import { ProductCardSkeleton } from "@/modules/products/shop/components/product-card-skeleton";

/**
 * The catalogue's fallback (ADR-0040): `/produtos` and the Category route
 * beneath it are dynamic and `caller`-only, so the page awaits everything and
 * there is no shell to keep. This file is also what makes the route
 * prefetchable at all — without it a dynamic route is not prefetched.
 *
 * Page-shaped, which is why it lives here and not in the module: the heading,
 * the bar's two controls, and two desktop rows of `ProductCardSkeleton` in the
 * catalogue's grid. How many cards in what arrangement is the route's
 * knowledge.
 *
 * It does not fire on a filter change. Every control navigates inside a
 * transition, and a revealed boundary does not fall back during one — the grid
 * stays and dims instead (`docs/READ-PATH.md`, "Pending feedback").
 */
export default function CatalogLoading() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-12 md:py-16">
      <span role="status" className="sr-only">
        Carregando produtos…
      </span>

      <Skeleton className="h-9 w-48 motion-reduce:animate-none md:h-10" />

      <div className="flex items-center justify-between gap-4 border-y py-3">
        <Skeleton className="h-8 w-24 motion-reduce:animate-none" />
        <Skeleton className="h-8 w-44 motion-reduce:animate-none" />
      </div>

      <ul
        aria-hidden
        className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <li key={index}>
            <ProductCardSkeleton />
          </li>
        ))}
      </ul>
    </div>
  );
}
