"use client";

import { useRouter } from "next/navigation";
import type { Path } from "react-hook-form";
import {
  ProductForm,
  type ProductFormOptions,
  type ProductFormSubmit,
} from "@/modules/products/admin/components/product-form";
import { useCreateProduct } from "@/modules/products/admin/hooks/use-create-product";
import { NEW_PRODUCT } from "@/modules/products/constants";
import type { ProductFormValues } from "@/modules/products/schemas";

/**
 * The form body's first owner. It is thin on purpose (ADR-0019): which hook
 * fires, and where the Admin lands afterwards, is all that separates creating
 * a Product from editing one.
 *
 * **Navigation is the call site's tier** (`docs/DATA-FLOW.md`): the hook owns
 * invalidation and the success toast, and the push to the new Product's page
 * belongs here, because it is a fact about this surface and not about the
 * write. `router.push()` alone — the destination's server components render on
 * arrival, so a `refresh()` after it would be a second render of the page just
 * rendered.
 */
export function ProductCreateForm({ brands, categories }: ProductFormOptions) {
  const router = useRouter();
  const createProduct = useCreateProduct();

  const onSubmit: ProductFormSubmit = (values, form) => {
    createProduct.mutate(values, {
      onSuccess: ({ id }) => router.push(`/admin/products/${id}`),
      onError: (error) => {
        // A duplicate slug or SKU comes back naming the input that caused it,
        // so it is rendered there rather than as a toast the Admin has to
        // match up with a field by hand (ADR-0013). The cast is the type the
        // wire cannot carry: `data.field` is a string, and the paths this
        // procedure names are the ones the form registered.
        const field = error.data?.field;
        if (field) {
          form.setError(field as Path<ProductFormValues>, {
            message: error.message,
          });
        }
      },
    });
  };

  return (
    <ProductForm
      defaultValues={NEW_PRODUCT}
      onSubmit={onSubmit}
      isPending={createProduct.isPending}
      submitLabel="Criar produto"
      brands={brands}
      categories={categories}
    />
  );
}
