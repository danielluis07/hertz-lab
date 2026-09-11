import "server-only";

import { isNull } from "drizzle-orm";
import { db } from "@/db";
import { category } from "@/db/schema";
import { LOCALE } from "@/lib/constants";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";

/** Built once, for the reason `docs/CONVENTIONS.md` gives its formatters. */
const collator = new Intl.Collator(LOCALE);

export const shopRouter = createTRPCRouter({
  /**
   * The root Categories — those with no parent — as `{ name, slug,
   * imageS3Key }`, unpaginated: ADR-0022's two-level tree bounds the list.
   *
   * Two surfaces read it: the shop frame's header links and footer column
   * (`modules/categories/shop.ts`), and `/`'s Categorias strip, which
   * is what the picture is carried for. The frame ignores it. No children:
   * nothing wants two levels in one payload, and a root Category page's child
   * strip arrives with its own `bySlug` read (ADR-0042).
   *
   * **Sorted here, alphabetically, and not with `ORDER BY name`.** A Category
   * has no inherent order (`CONTEXT.md`), so the order belongs to whoever
   * renders the list — and putting it in the read is what stops the header,
   * the footer and the home strip disagreeing about it. The pt-BR collator
   * rather than the database's, whose `C` collation puts "Áudio" after
   * "Zumbidos" (ADR-0042).
   */
  roots: baseProcedure.query(async () => {
    const rows = await db
      .select({
        name: category.name,
        slug: category.slug,
        imageS3Key: category.imageS3Key,
      })
      .from(category)
      .where(isNull(category.parentId));

    return rows.sort((a, b) => collator.compare(a.name, b.name));
  }),
});
