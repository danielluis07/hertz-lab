"use client";

import { useState } from "react";
import {
  galleryImages,
  initialPurchase,
  isBuyable,
  quantitySteps,
  selectedVariant,
  selectImage,
  selectVariant,
  setQuantity,
  variantPrice,
} from "@/modules/products/shop/purchase";
import type { ProductPurchaseFields } from "@/modules/products/shop/types";

/**
 * The purchase area's one state — selected Variant, selected photograph and
 * quantity — and everything the Gallery and Buy panel derive from it. The
 * transitions are `purchase.ts`'s; this only holds the result.
 *
 * Local state, and never the URL: there is no Variant query parameter
 * (`docs/STOREFRONT.md`), which is also what keeps the route prerendered.
 */
export function useProductPurchase({
  variants,
  images,
}: Pick<ProductPurchaseFields, "variants" | "images">) {
  const [state, setState] = useState(() => initialPurchase(variants));

  const variant = selectedVariant(variants, state);
  const gallery = galleryImages(images, variant.id);

  return {
    variant,
    price: variantPrice(variant),
    buyable: isBuyable(variant),
    gallery,
    imageIndex: state.imageIndex,
    quantity: state.quantity,
    steps: quantitySteps(state.quantity, variant.stockQuantity),
    selectVariant: (variantId: string) =>
      setState((current) => selectVariant(current, variantId)),
    selectImage: (imageIndex: number) =>
      setState((current) => selectImage(current, imageIndex, gallery.length)),
    setQuantity: (quantity: number) =>
      setState((current) =>
        setQuantity(current, quantity, variant.stockQuantity),
      ),
  };
}
