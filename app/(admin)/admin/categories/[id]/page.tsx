import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { requireAdmin } from "@/lib/auth-guards";
import { CategoryEditForm } from "@/modules/categories/admin/components/category-edit-form";
import { caller, HydrateClient, load, trpc } from "@/trpc/server";

/**
 * **`load`, not `prefetch`**: the heading below needs the Category's name and
 * the form reads the same query, so one fetch serves both consumers and the
 * result is still dehydrated for the client that asks for it (ADR-0011).
 *
 * `null` becomes `notFound()` here, because a read resolves absence to
 * "absent" and the framework call belongs in the page — which is where
 * ADR-0006 already puts `requireAdmin()`, in `page.tsx` and never in the
 * layout.
 *
 * The roots come through `caller` instead: nothing reads them as a query, the
 * form takes them as a prop, so hydrating them would ship a payload nothing
 * deserialises. They are `parentOptions` rather than `options` because a child
 * cannot be a parent, and `excludeId` is this Category, which may not be its
 * own — refusal 1 of ADR-0022, kept out of the Admin's reach rather than only
 * refused after the save.
 *
 * Both run in parallel, because neither waits on the other: the exclusion is
 * the id from the URL, not anything the row has to tell us.
 */
const AdminEditCategoryPage = async ({
  params,
}: PageProps<"/admin/categories/[id]">) => {
  await requireAdmin();

  const { id } = await params;

  const [category, parentOptions] = await Promise.all([
    load(trpc.categories.admin.byId.queryOptions({ id })),
    caller.categories.admin.parentOptions({ excludeId: id }),
  ]);

  if (!category) notFound();

  return (
    <HydrateClient>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Link
            href="/admin/categories"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm">
            <ArrowLeftIcon className="size-4" aria-hidden />
            Voltar para categorias
          </Link>
          {/* Rendered on the server, which is why the form refreshes the route
              after a save: a rename has to reach the heading too. */}
          <h1 className="text-2xl font-semibold">{category.name}</h1>
          <p className="text-muted-foreground text-sm">
            Renomear a categoria não muda a URL: o endereço já foi
            compartilhado.
          </p>
        </div>

        <CategoryEditForm id={id} parentOptions={parentOptions} />
      </div>
    </HydrateClient>
  );
};

export default AdminEditCategoryPage;
