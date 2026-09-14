import Link from "next/link";
import { useId } from "react";
import { ArrowRightIcon } from "lucide-react";
import { ProductCard } from "@/modules/products/shop/components/product-card";
import type { ProductCardRow } from "@/modules/products/shop/types";

/**
 * One of `/`'s four Product previews: a section heading, the link to the
 * catalogue view that ranking is a window onto, and at most one row of the
 * shared card (`docs/STOREFRONT.md`). A server component, and nothing home-
 * specific inside it — the ranking and its exclusions are the page's.
 *
 * **Absent when empty**, not an empty state: a home page that says
 * "Nenhuma promoção" is advertising what the store does not have, and the
 * previews after it backfill regardless.
 *
 * The grid is two columns, then four — not the catalogue's three at tablet
 * width. A preview is four cards at most, and three columns would strand the
 * fourth on a row of its own.
 *
 * The heading row is ruled with a hairline above it, which is what separates
 * one preview from the next; the "Ver todos" link carries the section name for
 * a screen reader, because four identical link names on one page say nothing
 * about where each one goes.
 */
export function ProductPreview({
  heading,
  href,
  products,
}: {
  /** The pt-BR section name, which is also the page outline's `<h2>`. */
  heading: string;
  /** The catalogue view this preview is the first row of. */
  href: string;
  products: ProductCardRow[];
}) {
  const headingId = useId();

  if (products.length === 0) return null;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-8">
      <div className="flex items-baseline justify-between gap-4 border-t pt-6">
        <h2
          id={headingId}
          className="text-xl font-medium tracking-tight md:text-2xl">
          {heading}
        </h2>
        <Link
          href={href}
          className="group/more inline-flex shrink-0 items-center gap-1.5 text-sm decoration-1 underline-offset-4 hover:underline focus-visible:underline">
          Ver todos
          <span className="sr-only">: {heading}</span>
          <ArrowRightIcon
            aria-hidden
            className="size-4 transition-transform duration-150 ease-out group-hover/more:translate-x-0.5 motion-reduce:transition-none"
          />
        </Link>
      </div>

      <ul className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
        {products.map((product) => (
          <li key={product.id}>
            <ProductCard
              product={product}
              headingLevel="h3"
              // Two columns, then four inside `max-w-7xl`, where four settle
              // near 290px (DESIGN.md). Never preloaded: the Hero is the LCP.
              sizes="(min-width: 1280px) 290px, (min-width: 1024px) 25vw, 50vw"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
