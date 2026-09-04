import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { requireAdmin } from "@/lib/auth-guards";
import { ProductEditForm } from "@/modules/products/admin/components/product-edit-form";
import { caller, HydrateClient, load, trpc } from "@/trpc/server";

/**
 * **`load`, not `prefetch`**: the heading below needs the Product's name and
 * the form reads the same query, so one fetch serves both consumers and the
 * result is still dehydrated for the client that asks for it (ADR-0011).
 *
 * `null` becomes `notFound()` here, because a read resolves absence to
 * "absent" and the framework call belongs in the page — which is where
 * ADR-0006 already puts `requireAdmin()`, in `page.tsx` and never in the
 * layout.
 *
 * The Brand and Category options come through `caller` instead: nothing reads
 * them as a query, the form takes them as props, so hydrating them would ship
 * a payload nothing deserialises. All three run in parallel, because none of
 * them waits on another.
 */
const AdminEditProductPage = async ({
  params,
}: PageProps<"/admin/products/[id]">) => {
  await requireAdmin();

  const { id } = await params;

  const [product, brands, categories] = await Promise.all([
    load(trpc.products.admin.byId.queryOptions({ id })),
    caller.brands.admin.options(),
    caller.categories.admin.options(),
  ]);

  if (!product) notFound();

  return (
    <HydrateClient>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Link
            href="/admin/products"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm">
            <ArrowLeftIcon className="size-4" aria-hidden />
            Voltar para produtos
          </Link>
          {/* Rendered on the server, which is why the form refreshes the route
              after a save: a rename has to reach the heading too. */}
          <h1 className="text-2xl font-semibold">{product.name}</h1>
          <p className="text-muted-foreground text-sm">
            Publicar e arquivar são ações da lista de produtos.
          </p>
        </div>

        <ProductEditForm id={id} brands={brands} categories={categories} />
      </div>
    </HydrateClient>
  );
};

export default AdminEditProductPage;
