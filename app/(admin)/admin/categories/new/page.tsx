import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { requireAdmin } from "@/lib/auth-guards";
import { CategoryCreateForm } from "@/modules/categories/admin/components/category-create-form";
import { caller } from "@/trpc/server";

/**
 * **Nothing to prefetch**: there is no Category yet, and the form's values
 * come from a module constant rather than from a query. So no `HydrateClient`
 * and no Suspense boundary either — the only await here is the one list the
 * shell itself needs.
 *
 * The roots come through `caller` and go down as a prop: no client component
 * reads them as a query, so there is nothing to hydrate (ADR-0011). It is
 * `parentOptions` rather than `options` because a child cannot be a parent
 * (ADR-0022), and no `excludeId` because a Category that does not exist yet
 * has no id to exclude.
 *
 * The page owns its own heading and "Voltar", and there is no breadcrumb and
 * no `loading.tsx` — ADR-0015 leaves the frame to the layout and everything
 * inside it to the page.
 */
const AdminNewCategoryPage = async () => {
  await requireAdmin();

  const parentOptions = await caller.categories.admin.parentOptions();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/admin/categories"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm">
          <ArrowLeftIcon className="size-4" aria-hidden />
          Voltar para categorias
        </Link>
        <h1 className="text-2xl font-semibold">Nova categoria</h1>
        {/* The two-level rule is not repeated here: it is said once, under
            the field where the choice is made. */}
        <p className="text-muted-foreground text-sm">
          Assim que existir, a categoria já aparece na lista e pode receber
          produtos.
        </p>
      </div>

      <CategoryCreateForm parentOptions={parentOptions} />
    </div>
  );
};

export default AdminNewCategoryPage;
