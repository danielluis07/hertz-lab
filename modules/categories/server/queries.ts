import "server-only";

import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { category } from "@/db/schema";

/**
 * The two lookups `create` and `update` share.
 *
 * **This file exists because a second caller arrived** — ADR-0010 creates no
 * query layer before one does, and `update` (#61) is it. `create`'s docblock
 * named this file before it existed, for the slug lookup; the parent read
 * below joined it on the same rule, being the same five lines asked verbatim
 * by both procedures.
 *
 * Arguments in, rows out: no class, no interface, no injection. **The refusals
 * stay with the procedures** (ADR-0022), because ADR-0013 keeps a pt-BR
 * sentence beside the rule that raises it — and the sentence a Category with
 * children reads is one only `update` can say.
 */

/**
 * A transaction handle, derived from `db` so it cannot drift from the driver —
 * the same type the products module's query layer takes. Both callers run
 * inside their own write, so a lookup has to see what that write has done so
 * far.
 */
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * The id of the Category holding this slug, or `undefined` if it is free.
 *
 * `exceptId` is the row being edited: a Category does not collide with its own
 * URL, so an Admin fixing a typo in the name is not told the address is taken.
 * It is absent on create, where a Category that does not exist yet has no slug
 * of its own to collide with.
 *
 * Read-then-write, so two Admins racing on one slug can still collide on the
 * unique index — the loser reads the generic pt-BR toast. That trade is the
 * reason to ask at all: a constraint violation names a Postgres index, and
 * what a form needs is the field that caused it.
 */
export async function findCategoryIdWithSlug(
  tx: Transaction,
  { slug, exceptId }: { slug: string; exceptId?: string },
): Promise<string | undefined> {
  const [taken] = await tx
    .select({ id: category.id })
    .from(category)
    .where(
      and(
        eq(category.slug, slug),
        exceptId ? ne(category.id, exceptId) : undefined,
      ),
    )
    .limit(1);

  return taken?.id;
}

/**
 * The Category an Admin proposes to hang a row under, read as the one fact
 * ADR-0022's first two refusals are decided on: **whether it exists, and
 * whether it is itself a child.**
 *
 * The two absences it can return mean different things, and both callers
 * separate them. `undefined` is a parent deleted since the Select was filled —
 * `NOT_FOUND`. A row whose own `parentId` is not null is a parent that is
 * already a child, which is a `CONFLICT` between the write and the shape the
 * tree is in, because a tree two levels deep has no third.
 *
 * Nothing else of the row is read: the name an Admin picked from the Select is
 * the name they already have, and a procedure selecting columns it does not
 * decide on invites the next reader to use them.
 */
export async function findParentCandidate(
  tx: Transaction,
  id: string,
): Promise<{ parentId: string | null } | undefined> {
  const [proposed] = await tx
    .select({ parentId: category.parentId })
    .from(category)
    .where(eq(category.id, id))
    .limit(1);

  return proposed;
}
