import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { requireAdmin } from "@/lib/auth-guards";
import { ProductCreateForm } from "@/modules/products/admin/components/product-create-form";
import { caller } from "@/trpc/server";

/**
 * **Nothing to prefetch**: there is no Product yet, and the form's values come
 * from a module constant rather than from a query (`docs/PRODUCTS-ADMIN.md`).
 * So no `HydrateClient` and no Suspense boundary either — the only awaits here
 * are the two option sets the shell itself needs.
 *
 * The route composes three modules, which is ADR-0008's rule 4: it reads the
 * Brand and Category options through `caller` and hands them down as props,
 * rather than letting `products` reach into either. In parallel, because
 * neither waits on the other.
 *
 * The page owns its own heading and "Voltar", and there is no breadcrumb and
 * no `loading.tsx` — ADR-0015 leaves the frame to the layout and everything
 * inside it to the page.
 */
const AdminNewProductPage = async () => {
  await requireAdmin();

  const [brands, categories] = await Promise.all([
    caller.brands.admin.options(),
    caller.categories.admin.options(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/admin/products"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm">
          <ArrowLeftIcon className="size-4" aria-hidden />
          Voltar para produtos
        </Link>
        <h1 className="text-2xl font-semibold">Novo produto</h1>
        <p className="text-muted-foreground text-sm">
          O produto nasce como rascunho: publique-o quando a listagem estiver
          pronta.
        </p>
      </div>

      <ProductCreateForm brands={brands} categories={categories} />
    </div>
  );
};

export default AdminNewProductPage;
