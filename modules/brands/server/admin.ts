import "server-only";

import { asc } from "drizzle-orm";
import { db } from "@/db";
import { brand } from "@/db/schema";
import { adminProcedure, createTRPCRouter } from "@/trpc/init";

export const adminRouter = createTRPCRouter({
  /**
   * Every Brand as `{ id, name }`, unpaginated, for a select on another
   * module's surface — the products list filter today, the product form next.
   *
   * It exists for the **composing route**, not for the brands list: ADR-0008's
   * rule 4 has the route read both option sets and hand them down, rather than
   * `products` reaching into `brands`. The route calls it through `caller`,
   * because no client component reads it as a query (`docs/MODULES.md`).
   *
   * No pagination and no search on purpose. A dropdown has to offer every
   * option, and a store has tens of brands; the day it has thousands, the
   * control becomes a combobox and this becomes a search procedure.
   */
  options: adminProcedure.query(async () =>
    db
      .select({ id: brand.id, name: brand.name })
      .from(brand)
      .orderBy(asc(brand.name)),
  ),
});
