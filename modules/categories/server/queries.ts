import "server-only";

import { and, eq, ne } from "drizzle-orm";
import type { Transaction } from "@/db";
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
 *
 * Both take the caller's open `Transaction`, because both run inside a write
 * and have to see what that write has done so far.
 */

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
 *
 * **`FOR UPDATE`, and that is not incidental.** Postgres runs this at `READ
 * COMMITTED`, where checking the tree and writing it are two moments a
 * concurrent write fits between: `create` reads that Áudio is a root while
 * `update` is midway through giving Áudio a parent of its own, both commit,
 * and the tree is three levels deep with no constraint having been violated.
 * There is no unique index to catch this the way one catches a raced slug —
 * ADR-0022's bound is a rule, not a column — so the lock is the only backstop
 * it has.
 *
 * The lock is on **the row whose parenthood is in question**, which is what
 * makes it sufficient rather than merely careful: every pair of writes that
 * could build a third level reads that one row, so every such pair contends
 * here. `update` locks the row it is editing for the same reason, from the
 * other side.
 *
 * Two writers that lock a pair of rows in opposite orders deadlock instead,
 * and Postgres aborts one of them. That is the loser reading a generic pt-BR
 * toast — the same degradation this module already accepts for a raced slug,
 * and a better one than a tree that cannot be rendered.
 */
export async function findParentCandidate(
  tx: Transaction,
  id: string,
): Promise<{ parentId: string | null } | undefined> {
  const [proposed] = await tx
    .select({ parentId: category.parentId })
    .from(category)
    .where(eq(category.id, id))
    .limit(1)
    .for("update");

  return proposed;
}
