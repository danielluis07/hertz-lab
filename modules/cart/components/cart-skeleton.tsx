import { Skeleton } from "@/components/ui/skeleton";

/**
 * `/carrinho`'s `<Suspense>` fallback (ADR-0040): the filled Cart's shape —
 * two lines and the summary beside them — without its data. A filled Cart is
 * what most shoppers arriving here have, so this is the shape least likely to
 * jump when the real one streams in.
 */
export function CartSkeleton() {
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-16">
      <span role="status" className="sr-only">
        Carregando carrinho…
      </span>

      <ul aria-hidden className="divide-y border-y">
        {Array.from({ length: 2 }, (_, index) => (
          <li
            key={index}
            className="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-4 py-6 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-x-6">
            <Skeleton className="aspect-square w-full rounded-lg motion-reduce:animate-none" />
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-1 flex-col gap-1">
                  <Skeleton className="h-6 w-3/5 motion-reduce:animate-none" />
                  <Skeleton className="h-5 w-24 motion-reduce:animate-none" />
                  <Skeleton className="h-5 w-28 motion-reduce:animate-none" />
                </div>
                <Skeleton className="h-6 w-20 motion-reduce:animate-none" />
              </div>
              <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-9 w-28 rounded-lg motion-reduce:animate-none" />
                <Skeleton className="h-8 w-24 motion-reduce:animate-none" />
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div aria-hidden className="flex flex-col gap-6 rounded-lg border p-6">
        <Skeleton className="h-4 w-16 motion-reduce:animate-none" />
        <div className="flex items-baseline justify-between gap-4">
          <Skeleton className="h-6 w-20 motion-reduce:animate-none" />
          <Skeleton className="h-8 w-32 motion-reduce:animate-none" />
        </div>
        <Skeleton className="h-10 w-full motion-reduce:animate-none" />
        <Skeleton className="h-11 w-full rounded-lg motion-reduce:animate-none" />
      </div>
    </div>
  );
}
