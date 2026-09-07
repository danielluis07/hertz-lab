"use client";

import { useRouter } from "next/navigation";
import type { Path } from "react-hook-form";
import {
  CategoryForm,
  type CategoryFormOptions,
  type CategoryFormSubmit,
} from "@/modules/categories/admin/components/category-form";
import { useCreateCategory } from "@/modules/categories/admin/hooks/use-create-category";
import { NEW_CATEGORY } from "@/modules/categories/constants";
import type { CategoryFormValues } from "@/modules/categories/schemas";

/**
 * The form body's first owner. It is thin on purpose: which hook fires, and
 * where the Admin lands afterwards, is all that separates creating a Category
 * from editing one.
 *
 * **Navigation is the call site's tier** (`docs/DATA-FLOW.md`): the hook owns
 * invalidation and the success toast, and the push to the new Category's page
 * belongs here, because it is a fact about this surface and not about the
 * write. `router.push()` alone — the destination's server components render on
 * arrival, so a `refresh()` after it would be a second render of the page just
 * rendered.
 */
export function CategoryCreateForm({ parentOptions }: CategoryFormOptions) {
  const router = useRouter();
  const createCategory = useCreateCategory();

  const onSubmit: CategoryFormSubmit = (values, form) => {
    createCategory.mutate(values, {
      onSuccess: ({ id }) => router.push(`/admin/categories/${id}`),
      onError: (error) => {
        // A duplicate slug, or a parent the tree refuses, comes back naming
        // the input that caused it, so it is rendered there rather than as a
        // toast the Admin has to match up with a field by hand (ADR-0013).
        // The cast is the type the wire cannot carry: `data.field` is a
        // string, and the paths this procedure names are the ones the form
        // registered.
        const field = error.data?.field;
        if (field) {
          form.setError(field as Path<CategoryFormValues>, {
            message: error.message,
          });
        }
      },
    });
  };

  return (
    <CategoryForm
      defaultValues={NEW_CATEGORY}
      onSubmit={onSubmit}
      isPending={createCategory.isPending}
      submitLabel="Criar categoria"
      parentOptions={parentOptions}
    />
  );
}
