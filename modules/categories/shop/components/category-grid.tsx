import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";

import { CatalogImage } from "@/components/catalog-image";
import { cn } from "@/lib/utils";

type CategoryTile = {
  name: string;
  slug: string;
  imageS3Key: string | null;
};

/**
 * The homepage's visual index of root Categories.
 *
 * One explicitly chosen root anchors the mosaic; the rest keep equal weight.
 * The caller puts that root first so visual, keyboard and screen-reader order
 * agree. Additional roots follow the four-tile matrix as ordinary squares.
 */
export function CategoryGrid({
  categories,
  featuredSlug,
}: {
  categories: CategoryTile[];
  featuredSlug: string;
}) {
  if (categories.length === 0) return null;

  return (
    <section aria-labelledby="home-categorias" className="flex flex-col gap-8">
      <h2
        id="home-categorias"
        className="border-t pt-6 text-xl font-medium tracking-tight md:text-2xl"
      >
        Categorias
      </h2>

      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {categories.map((category) => {
          const isFeatured = category.slug === featuredSlug;

          return (
            <li
              key={category.slug}
              className={cn(
                "min-w-0",
                isFeatured && "col-span-2 md:row-span-2",
              )}
            >
              <Link
                href={`/produtos/${category.slug}`}
                className={cn(
                  "group/category bg-muted relative block h-full overflow-hidden rounded-sm border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  isFeatured
                    ? "aspect-video sm:aspect-[2/1] md:aspect-auto"
                    : "aspect-square",
                )}
              >
                <CatalogImage
                  s3Key={category.imageS3Key}
                  alt=""
                  sizes={
                    isFeatured
                      ? "(min-width: 1280px) 610px, (min-width: 768px) 50vw, calc(100vw - 3rem)"
                      : "(min-width: 1280px) 300px, (min-width: 768px) 25vw, calc((100vw - 3.75rem) / 2)"
                  }
                  className="absolute inset-0 size-full aspect-auto transition-transform duration-150 ease-out group-hover/category:scale-[1.015] motion-reduce:transition-none"
                />

                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/90 via-black/15 via-60% to-black/5"
                />

                <span
                  className={cn(
                    "absolute inset-x-0 bottom-0 flex items-end justify-between gap-3",
                    isFeatured ? "p-5 sm:p-6" : "p-3 sm:p-4",
                  )}
                >
                  <span className="flex min-w-0 flex-col gap-1">
                    {isFeatured && (
                      <span
                        aria-hidden
                        className="text-background/75 text-xs tracking-wide uppercase"
                      >
                        Em destaque
                      </span>
                    )}
                    <span
                      className={cn(
                        "text-background leading-tight font-semibold tracking-tight",
                        isFeatured
                          ? "text-2xl sm:text-3xl md:text-4xl"
                          : "text-sm sm:text-base lg:text-xl",
                      )}
                    >
                      {category.name}
                    </span>
                  </span>
                  {isFeatured && (
                    <ArrowRightIcon
                      aria-hidden
                      className="text-background mb-0.5 size-6 shrink-0 transition-transform duration-150 ease-out group-hover/category:translate-x-0.5 motion-reduce:transition-none"
                    />
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
