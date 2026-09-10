import { Skeleton } from "@/components/ui/skeleton";

/**
 * `ProductCard`'s shape without its data: the square Cover and the three lines
 * beneath it. Beside the card because it knows the card's shape
 * (`docs/READ-PATH.md`); how many of them, in what arrangement, is the route's
 * knowledge, so `produtos/loading.tsx` maps it (ADR-0040).
 */
export function ProductCardSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-3">
      <Skeleton className="aspect-square w-full rounded-lg motion-reduce:animate-none" />
      <div className="flex flex-col gap-1">
        <Skeleton className="h-4 w-16 motion-reduce:animate-none" />
        <Skeleton className="h-6 w-4/5 motion-reduce:animate-none" />
        <Skeleton className="h-6 w-24 motion-reduce:animate-none" />
      </div>
    </div>
  );
}
