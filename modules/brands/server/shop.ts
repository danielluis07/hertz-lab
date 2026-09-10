import "server-only";

import { and, eq, exists, sql } from "drizzle-orm";
import { db } from "@/db";
import { brand, product } from "@/db/schema";
import { LOCALE } from "@/lib/constants";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";

/** Built once, for the reason `docs/CONVENTIONS.md` gives its formatters. */
const collator = new Intl.Collator(LOCALE);

export const shopRouter = createTRPCRouter({
  /**
   * The catalogue's Marca options: every Brand **with at least one visible
   * Product**, as `{ id, name }`, unpaginated (ADR-0025 bounds Brands).
   *
   * A shop `options` read offers nothing that cannot return a result
   * (`docs/MODULES.md`). A Brand whose Products are all `draft` or `archived`
   * is not empty, so it is never deleted, and left in the filter it would
   * produce an empty grid for a shopper who filtered correctly. Not scoped to
   * the Category being browsed — options churning as a shopper walks the tree
   * would read as an answer.
   *
   * **The semi-join reads `product.status`**, which is more than ADR-0024's
   * inbound count and is what `docs/MODULES.md` specifies for this read. It
   * spells the clause out rather than importing
   * `products/server/visibility.ts`: `brands` sits below `products`
   * (ADR-0009, ADR-0029), and the import would close a cycle. The probe
   * reaches a Brand's Products through `product_brand_idx` and rechecks the
   * status on the rows it finds.
   *
   * Sorted with the pt-BR collator here rather than `ORDER BY name`, whose
   * `C` collation puts "Áudio" after "Zumbidos" (ADR-0042).
   * `brands.admin.options` still sorts in the database, deliberately.
   */
  options: baseProcedure.query(async () => {
    const rows = await db
      .select({ id: brand.id, name: brand.name })
      .from(brand)
      .where(
        exists(
          db
            .select({ one: sql`1` })
            .from(product)
            .where(
              and(eq(product.brandId, brand.id), eq(product.status, "active")),
            ),
        ),
      );

    return rows.sort((a, b) => collator.compare(a.name, b.name));
  }),
});
