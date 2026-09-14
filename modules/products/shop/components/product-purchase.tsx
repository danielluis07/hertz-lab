"use client";

import { ProductBuyPanel } from "@/modules/products/shop/components/product-buy-panel";
import { ProductGallery } from "@/modules/products/shop/components/product-gallery";
import { useBuyVariant } from "@/modules/products/shop/hooks/use-buy-variant";
import { useProductPurchase } from "@/modules/products/shop/hooks/use-product-purchase";
import type { ProductPurchaseFields } from "@/modules/products/shop/types";

/**
 * The product page's purchase area, and its one client entry point: Gallery
 * and Buy panel together, because the selected Variant, the selected
 * photograph and the quantity are one state (`docs/STOREFRONT.md`).
 *
 * It receives only the fields those two render. Description, Specifications,
 * Reviews and Related Products stay server markup outside this graph.
 */
export function ProductPurchase({
  product,
}: {
  product: ProductPurchaseFields;
}) {
  const purchase = useProductPurchase(product);
  const { buy, adding } = useBuyVariant(product.slug);

  return (
    <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
      <ProductGallery
        images={purchase.gallery}
        selectedIndex={purchase.imageIndex}
        onSelect={purchase.selectImage}
      />
      <ProductBuyPanel
        product={product}
        purchase={purchase}
        adding={adding}
        onBuy={() =>
          buy({ variantId: purchase.variant.id, quantity: purchase.quantity })
        }
      />
    </div>
  );
}
