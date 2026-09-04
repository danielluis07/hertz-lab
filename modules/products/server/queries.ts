import "server-only";

import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { product, productVariant } from "@/db/schema";

/**
 * The two uniqueness lookups `create` and `update` share.
 *
 * **This file exists because a second caller arrived** — ADR-0010 creates no
 * query layer before one does, and `update` is it. Both queries answer the
 * same shape of question in both procedures and differ only in whether the row
 * being written is excluded from the answer, which is a parameter rather than
 * a second query.
 *
 * Arguments in, rows out: no class, no interface, no injection. **The refusals
 * stay with the procedures**, because ADR-0013 keeps a pt-BR sentence beside
 * the rule that raises it, and the two callers name different fields.
 */

/**
 * A transaction handle, derived from `db` so it cannot drift from the driver —
 * the same type `rating.ts` takes. Both callers run inside their own write, so
 * the lookup has to see what that write has done so far.
 */
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * The id of the Product holding this slug, or `undefined` if it is free.
 *
 * `exceptId` is the row being edited: a Product does not collide with its own
 * URL, so an Admin fixing a typo in the name is not told the address is taken.
 *
 * Read-then-write, so two Admins racing on one slug can still collide on the
 * unique index — the loser sees the generic pt-BR toast. That trade is the
 * reason to ask at all: a constraint violation names a Postgres index, and
 * what a form needs is the field that caused it.
 */
export async function findProductIdWithSlug(
  tx: Transaction,
  { slug, exceptId }: { slug: string; exceptId?: string },
): Promise<string | undefined> {
  const [taken] = await tx
    .select({ id: product.id })
    .from(product)
    .where(
      and(
        eq(product.slug, slug),
        exceptId ? ne(product.id, exceptId) : undefined,
      ),
    );

  return taken?.id;
}

/**
 * Which of these SKUs are already held by a Variant, as a set the caller can
 * ask about row by row.
 *
 * `exceptProductId` excludes the aggregate being written, whose own Variants
 * hold their own SKUs. Only the SKUs *other* Products hold are a question for
 * the database: two rows of one form sharing one is a payload `productSchema`
 * already refuses, in the browser and again through `.input()`.
 */
export async function findSkusInUse(
  tx: Transaction,
  { skus, exceptProductId }: { skus: string[]; exceptProductId?: string },
): Promise<Set<string>> {
  const rows = await tx
    .select({ sku: productVariant.sku })
    .from(productVariant)
    .where(
      and(
        inArray(productVariant.sku, skus),
        exceptProductId
          ? ne(productVariant.productId, exceptProductId)
          : undefined,
      ),
    );

  return new Set(rows.map((row) => row.sku));
}
