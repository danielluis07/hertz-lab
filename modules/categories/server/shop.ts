import "server-only";

import { isNull } from "drizzle-orm";
import { db } from "@/db";
import { category } from "@/db/schema";
import { LOCALE } from "@/lib/constants";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { categoryBySlugInputSchema } from "@/modules/categories/shop/schemas";

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

  /**
   * One Category by slug, for `/produtos/[...categoria]`, or `null` — which the
   * page turns into `notFound()` (`docs/MODULES.md`).
   *
   * **One read, four jobs** (ADR-0043): the heading and description, the
   * canonical-path check (`parentSlug`), the child strip (`children`) and the
   * catalogue's subtree ids. The parent's name is the breadcrumb's root
   * segment (ADR-0053). Anything narrower makes the page read a row it already
   * had.
   *
   * The parent is flattened to `parentSlug` and `parentName`, the shape
   * `categoryPath` and `products.shop.bySlug`'s Category already speak, so
   * the path rule and the trail take this row as it arrives.
   *
   * Children are sorted by the pt-BR collator for the reason `roots` gives. A
   * child's `children` is always empty (ADR-0022), which is what lets the page
   * treat both levels with one code path.
   */
  bySlug: baseProcedure
    .input(categoryBySlugInputSchema)
    .query(async ({ input }) => {
      const row = await db.query.category.findFirst({
        columns: { id: true, name: true, slug: true, description: true },
        where: { slug: input.slug },
        with: {
          parent: { columns: { name: true, slug: true } },
          children: {
            columns: { id: true, name: true, slug: true, imageS3Key: true },
          },
        },
      });

      if (!row) return null;

      const { parent, children, ...fields } = row;

      return {
        ...fields,
        parentSlug: parent?.slug ?? null,
        parentName: parent?.name ?? null,
        children: children.sort((a, b) => collator.compare(a.name, b.name)),
      };
    }),
});
