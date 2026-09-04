"use client";

import { useRouter } from "next/navigation";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import type { Path } from "react-hook-form";
import { toProductFormValues } from "@/modules/products/admin/form-values";
import {
  ProductForm,
  type ProductFormOptions,
  type ProductFormSubmit,
} from "@/modules/products/admin/components/product-form";
import { useUpdateProduct } from "@/modules/products/admin/hooks/use-update-product";
import type { ProductFormValues } from "@/modules/products/schemas";
import { useTRPC } from "@/trpc/client";

/**
 * The form body's second owner, and as thin as the first (ADR-0019): same
 * fields, a different hook, and a different thing to do afterwards. There is
 * no `mode` prop, here or below — a branch inside one component would put a
 * rule in a `.tsx`, and the two wrappers *are* the branch.
 *
 * It reads `byId` rather than taking the Product as a prop, and that is what
 * makes the page's `load` correct: a query is hydrated if and only if a client
 * component reads it (ADR-0011), and the page needs the same row for its
 * heading. One fetch, two consumers.
 *
 * **`router.refresh()` and no `push`.** The Admin stays on the page they
 * saved. The hook's `invalidateQueries` refreshes what the client holds, but
 * the `<h1>` came from the server's copy of this query and nothing on the
 * client can reach it — so a rename would leave the heading contradicting the
 * form until a hard navigation (`docs/DATA-FLOW.md`).
 */
export function ProductEditForm({
  id,
  brands,
  categories,
}: ProductFormOptions & { id: string }) {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: product } = useSuspenseQuery(
    trpc.products.admin.byId.queryOptions({ id }),
  );
  const updateProduct = useUpdateProduct();

  const onSubmit: ProductFormSubmit = (values, form) => {
    updateProduct.mutate(
      { ...values, id },
      {
        onSuccess: async () => {
          router.refresh();

          // **The form re-opens from the row the write produced**, and it has
          // to. A Variant the Admin added in this session went up without an
          // `id` and came back as a row that has one; form state still says it
          // has none, so a second save without a reload would read it as new —
          // and reconcile would delete the row the first save had just
          // created, taking every Cart line and Image pointing at it with it
          // (ADR-0019). `router.refresh()` cannot do this: it re-renders the
          // server's half of the page, and the form is uncontrolled.
          //
          // The hook's `invalidateQueries` has already put this fetch in
          // flight, so asking for it here joins that one rather than making a
          // second.
          const saved = await queryClient.query(
            trpc.products.admin.byId.queryOptions({ id }),
          );

          if (saved) form.reset(toProductFormValues(saved));
        },
        onError: (error) => {
          // The third error tier, identical to the create wrapper's: a
          // refusal that names an input is rendered on that input rather than
          // as a toast the Admin has to match up with a field by hand
          // (ADR-0013). Here that is a duplicate slug, a SKU another Product
          // holds, and the Variant an Order has already been placed against.
          const field = error.data?.field;
          if (field) {
            form.setError(field as Path<ProductFormValues>, {
              message: error.message,
            });
          }
        },
      },
    );
  };

  // `page.tsx` turned a missing Product into `notFound()` before this ever
  // rendered, so the `null` is the query's type and not a state this component
  // can be in (`docs/DATA-FLOW.md`, "Absence").
  if (!product) return null;

  return (
    <ProductForm
      defaultValues={toProductFormValues(product)}
      onSubmit={onSubmit}
      isPending={updateProduct.isPending}
      submitLabel="Salvar alterações"
      brands={brands}
      categories={categories}
    />
  );
}
