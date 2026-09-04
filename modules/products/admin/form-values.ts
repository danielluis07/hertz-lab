import type { ProductFormValues } from "@/modules/products/schemas";
import type { RouterOutput } from "@/trpc/routers/_app";

/**
 * The aggregate `byId` returns, once the page has ruled out the `null`.
 * Inferred from the procedure rather than from the tables: a type that tracks
 * the storage goes stale the first time the query selects a subset — which
 * this one already does, having dropped the `tsvector` (`docs/MODULES.md`).
 */
export type ProductDetail = NonNullable<
  RouterOutput["products"]["admin"]["byId"]
>;

/**
 * The Product as the form edits it: `byId`'s rows turned into the one
 * `defaultValues` object React Hook Form opens with, so editing starts from
 * the truth rather than from blanks.
 *
 * **It lives here rather than in the edit wrapper** because it holds a rule,
 * and a rule may not sit in a `.tsx` (`docs/CONVENTIONS.md`). The rule is
 * ADR-0019's: **an Image names its Variant by that Variant's index in the
 * form's array, never by a database id** — on create, where the Variants have
 * no ids yet, and on update alike, which is what keeps the two payloads one
 * shape and the form body one file.
 *
 * Everything else here is a copy. It is written out field by field rather than
 * spread, because `variants` and `specifications` arrive carrying `productId`,
 * `position` and timestamps that the payload has no business sending back:
 * `position` is the array index and is derived by the write (ADR-0018).
 */
export function toProductFormValues(product: ProductDetail): ProductFormValues {
  const indexById = new Map(
    product.variants.map((variant, index) => [variant.id, index]),
  );

  return {
    name: product.name,
    slug: product.slug,
    description: product.description,
    brandId: product.brandId,
    categoryId: product.categoryId,
    // The child ids are the whole point of carrying them: without them the
    // write has nothing to reconcile against, and every save would delete the
    // rows Orders and Carts point at (ADR-0019).
    variants: product.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      sku: variant.sku,
      priceAmount: variant.priceAmount,
      compareAtPriceAmount: variant.compareAtPriceAmount,
      stockQuantity: variant.stockQuantity,
      weightGrams: variant.weightGrams,
      lengthMm: variant.lengthMm,
      widthMm: variant.widthMm,
      heightMm: variant.heightMm,
    })),
    specifications: product.specifications.map((specification) => ({
      id: specification.id,
      label: specification.label,
      value: specification.value,
    })),
    images: product.images.map((image) => ({
      id: image.id,
      s3Key: image.s3Key,
      altText: image.altText,
      // Both halves of the fallback mean the same thing to the form: a shot of
      // the Product as a whole. The second is unreachable — an Image and the
      // Variant it points at come from one aggregate — and it is what the
      // lookup's `undefined` has to become.
      variantId: image.variantId === null ? null : (indexById.get(image.variantId) ?? null),
    })),
  };
}
