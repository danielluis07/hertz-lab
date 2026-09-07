"use client";

import { useRouter } from "next/navigation";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { Path } from "react-hook-form";
import {
  CategoryForm,
  type CategoryFormOptions,
  type CategoryFormSubmit,
} from "@/modules/categories/admin/components/category-form";
import { useUpdateCategory } from "@/modules/categories/admin/hooks/use-update-category";
import type { CategoryFormValues } from "@/modules/categories/schemas";
import { useTRPC } from "@/trpc/client";

/**
 * The form body's second owner, and as thin as the first: same fields, a
 * different hook, and a different thing to do afterwards. There is no `mode`
 * prop, here or below — a branch inside one component would put a rule in a
 * `.tsx`, and the two wrappers *are* the branch.
 *
 * It reads `byId` rather than taking the row as a prop, and that is what makes
 * the page's `load` correct: a query is hydrated if and only if a client
 * component reads it (ADR-0011), and the page needs the same row for its
 * heading. One fetch, two consumers.
 *
 * **`router.refresh()` and no `push`.** The Admin stays on the page they
 * saved. The hook's `invalidateQueries` refreshes what the client holds, but
 * the `<h1>` came from the server's copy of this query and nothing on the
 * client can reach it — so a rename would leave the heading contradicting the
 * form until a hard navigation (`docs/DATA-FLOW.md`).
 *
 * **Nothing is re-read into the form afterwards.** The products form has to,
 * because a Variant it created comes back holding an id its own state does not
 * have (ADR-0019); a Category has no child rows in its payload, so what the
 * Admin is looking at after a save is what the write stored.
 */
export function CategoryEditForm({
  id,
  parentOptions,
}: CategoryFormOptions & { id: string }) {
  const trpc = useTRPC();
  const router = useRouter();
  const { data: category } = useSuspenseQuery(
    trpc.categories.admin.byId.queryOptions({ id }),
  );
  const updateCategory = useUpdateCategory();

  const onSubmit: CategoryFormSubmit = (values, form) => {
    updateCategory.mutate(
      { ...values, id },
      {
        onSuccess: () => router.refresh(),
        onError: (error) => {
          // The third error tier, identical to the create wrapper's: a refusal
          // that names an input is rendered on that input rather than as a
          // toast the Admin has to match up with a field by hand (ADR-0013).
          // Here that is a duplicate URL, and each of the tree's three
          // refusals under the parent Select (ADR-0022).
          const field = error.data?.field;
          if (field) {
            form.setError(field as Path<CategoryFormValues>, {
              message: error.message,
            });
          }
        },
      },
    );
  };

  // `page.tsx` turned a missing Category into `notFound()` before this ever
  // rendered, so the `null` is the query's type and not a state this component
  // can be in (`docs/DATA-FLOW.md`, "Absence").
  if (!category) return null;

  return (
    <CategoryForm
      // The row's own columns, named one by one rather than spread: `id` and
      // the timestamps are not fields of this form, and a payload carrying
      // them would be sending back what it does not edit. This is a shape and
      // not a rule, which is why it is here and not at the module root — there
      // is no second thing it could say (ADR-0017).
      defaultValues={{
        name: category.name,
        slug: category.slug,
        description: category.description,
        parentId: category.parentId,
        imageS3Key: category.imageS3Key,
      }}
      onSubmit={onSubmit}
      isPending={updateCategory.isPending}
      submitLabel="Salvar alterações"
      parentOptions={parentOptions}
    />
  );
}
