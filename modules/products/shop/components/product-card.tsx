import Link from "next/link";
import { CatalogImage } from "@/components/catalog-image";
import { formatBRL } from "@/lib/utils/format";
import { cardPrice } from "@/modules/products/shop/card";
import type { ProductCardRow } from "@/modules/products/shop/types";

/**
 * The Product card of every shop grid — the catalogue, `/`'s previews and the
 * product page's related section all render this from one row type
 * (ADR-0045). A server component: a card is a link and a picture.
 *
 * Cover, Brand as meta, name, price (`docs/STOREFRONT.md`). **No rating** —
 * `rating_average` is `0` for every unreviewed Product, and a zero on
 * twenty-four cards is worse than nothing. **No badges, no shadow, no
 * hover-reveal and no accent**: a grid where every card carries vermilion is
 * the failure DESIGN.md's one-accent rule exists to prevent. The card is its
 * hairline and the space around it.
 *
 * The link is the name, stretched over the card by a pseudo-element: the whole
 * card is the target, and a screen reader hears the Product's name rather than
 * every word on the card.
 */
export function ProductCard({
  product,
  sizes,
  priority = false,
}: {
  product: ProductCardRow;
  /** The Cover's rendered width — the grid's to say (`CatalogImage`). */
  sizes: string;
  /** For the first row, whose Covers are the page's LCP candidates. */
  priority?: boolean;
}) {
  const price = cardPrice(product);

  return (
    <article className="group/card relative flex flex-col gap-3">
      <div className="overflow-hidden rounded-lg border">
        <CatalogImage
          s3Key={product.coverS3Key}
          alt={product.coverAltText}
          sizes={sizes}
          priority={priority}
        />
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-muted-foreground text-xs tracking-wide uppercase">
          {product.brandName}
        </p>
        <h2 className="line-clamp-2 text-base font-medium">
          <Link
            href={`/produto/${product.slug}`}
            className="decoration-1 underline-offset-4 group-hover/card:underline after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-ring">
            {product.name}
          </Link>
        </h2>
        <p className="flex flex-wrap items-baseline gap-x-2 tabular-nums">
          <span>
            {price.fromPrice && (
              <span className="text-muted-foreground text-sm">A partir de </span>
            )}
            {formatBRL(price.amount)}
          </span>
          {price.compareAt !== null && (
            <s className="text-muted-foreground text-sm">
              {/* A strike-through is not announced; the words are. */}
              <span className="sr-only">Preço anterior: </span>
              {formatBRL(price.compareAt)}
            </s>
          )}
        </p>
      </div>
    </article>
  );
}
