/**
 * PROTOTYPE — throwaway. The stress sketch for issue #11.
 *
 *   bun dev  ->  http://localhost:3000/prototype/product-form
 *
 * The list decision was taken on the list. This pushes the hard case through
 * the winner: an abstraction that only survives brands has not been tested.
 */

import Link from "next/link";
import { ProductForm } from "./product-form";

export default function ProductFormSketchPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <Link
          href="/prototype/admin-list"
          className="text-xs text-muted-foreground hover:underline">
          ← Voltar para a lista
        </Link>
        <h1 className="text-xl font-semibold">Novo produto</h1>
        <p className="text-sm text-muted-foreground">
          PROTOTYPE — sketch, issue #11. Nested variants, specification rows and
          out-of-band image upload, in shape (b).
        </p>
      </div>

      <ProductForm />
    </div>
  );
}
