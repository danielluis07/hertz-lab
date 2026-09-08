import "server-only";

import { and, ne, sql } from "drizzle-orm";
import type { Transaction } from "@/db";
import { brand } from "@/db/schema";

/**
 * The one lookup `create` and `update` share.
 *
 * **This file exists because a second caller arrived** — ADR-0010 creates no
 * query layer before one does, and the two writes of #76 arrive together
 * asking the same question, the second with an `exceptId`.
 *
 * Arguments in, rows out: no class, no interface, no injection. **The refusal
 * stays with the procedures**, because ADR-0013 keeps a pt-BR sentence beside
 * the rule that raises it.
 *
 * It takes the caller's open `Transaction`, because it runs inside a write and
 * has to see what that write has done so far.
 */

/**
 * The id of the Brand already holding this name, or `undefined` if it is free.
 *
 * **The comparison is `lower(name)` in SQL**, which is not a detail: it is the
 * same expression `brand_name_unique_idx` is built over, so this asks the
 * question the index answers. A JavaScript `toLowerCase()` beside the query
 * would be a second rule — one Postgres never agreed to — and the two would
 * part company on the first name where the collation and the runtime disagree.
 * Writing it over the column is also what lets the index serve the read.
 *
 * **Nothing is normalised on the way in.** "JBL" is stored as "JBL" and "Sony"
 * as "Sony"; case is what the *comparison* ignores, never what the write
 * flattens (`CONTEXT.md`).
 *
 * `exceptId` is the row being edited: a Brand does not collide with its own
 * name, so an Admin fixing the casing of one is not told the name is taken. It
 * is absent on create, where a Brand that does not exist yet has no name of its
 * own to collide with.
 *
 * Read-then-write, so two Admins racing on one name can still collide on the
 * unique index — the loser reads the generic pt-BR toast (ADR-0013). That
 * trade is the reason to ask at all: a constraint violation names a Postgres
 * index, and what a form needs is the field that caused it.
 */
export async function findBrandIdWithName(
  tx: Transaction,
  { name, exceptId }: { name: string; exceptId?: string },
): Promise<string | undefined> {
  const [taken] = await tx
    .select({ id: brand.id })
    .from(brand)
    .where(
      and(
        sql`lower(${brand.name}) = lower(${name})`,
        exceptId ? ne(brand.id, exceptId) : undefined,
      ),
    )
    .limit(1);

  return taken?.id;
}
