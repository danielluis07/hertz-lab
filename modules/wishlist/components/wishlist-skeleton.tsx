import { Skeleton } from "@/components/ui/skeleton";

/**
 * `/minha-conta/favoritos`'s `<Suspense>` fallback (ADR-0040): the filled
 * list's shape — a few rows of Cover, names, price and actions — without its
 * data, so the real rows replace it without a jump.
 */
export function WishlistSkeleton() {
  return (
    <div>
      <span role="status" className="sr-only">
        Carregando favoritos…
      </span>

      <ul aria-hidden className="divide-y border-y">
        {Array.from({ length: 3 }, (_, index) => (
          <li
            key={index}
            className="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-4 py-6 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-x-6">
            <Skeleton className="aspect-square w-full rounded-lg motion-reduce:animate-none" />
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-1 flex-col gap-1">
                  <Skeleton className="h-6 w-3/5 motion-reduce:animate-none" />
                  <Skeleton className="h-5 w-24 motion-reduce:animate-none" />
                </div>
                <Skeleton className="h-6 w-20 motion-reduce:animate-none" />
              </div>
              <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-9 w-48 rounded-lg motion-reduce:animate-none" />
                <Skeleton className="h-8 w-24 motion-reduce:animate-none" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
