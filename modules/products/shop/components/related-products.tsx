import { ProductCard } from "@/modules/products/shop/components/product-card";
import type { ProductCardRow } from "@/modules/products/shop/types";

/**
 * At most one row of the shared card for Products in the same Category
 * (ADR-0045). Two columns, then four — a row of four at most would strand the
 * fourth on its own at three. The page omits the section when it is empty.
 */
export function RelatedProducts({ products }: { products: ProductCardRow[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard
            product={product}
            headingLevel="h3"
            // Below the fold, so never preloaded; four settle near 290px
            // inside `max-w-7xl` (DESIGN.md).
            sizes="(min-width: 1280px) 290px, (min-width: 1024px) 25vw, 50vw"
          />
        </li>
      ))}
    </ul>
  );
}
