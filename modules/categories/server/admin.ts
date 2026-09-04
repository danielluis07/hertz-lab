import "server-only";

import { asc } from "drizzle-orm";
import { db } from "@/db";
import { category } from "@/db/schema";
import { adminProcedure, createTRPCRouter } from "@/trpc/init";

export const adminRouter = createTRPCRouter({
  /**
   * Every Category as `{ id, name }`, unpaginated — the twin of
   * `brands.admin.options`, and there for the same composing route
   * (ADR-0008's rule 4).
   *
   * **Flat, and sorted by name.** The tree is real — a Category has a
   * `parentId` — but a filter asks "which section", not "where in the
   * hierarchy", and an indented tree is the categories list's own surface to
   * build. Nothing here knows the tree, so nothing here goes stale when it
   * gains one.
   */
  options: adminProcedure.query(async () =>
    db
      .select({ id: category.id, name: category.name })
      .from(category)
      .orderBy(asc(category.name)),
  ),
});
