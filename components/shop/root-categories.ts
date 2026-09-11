import "server-only";

import { cache } from "react";
import { caller } from "@/trpc/server";

/**
 * The shop frame's nav: the root Categories, read from the catalogue because a
 * Category ships in a form submission, not in a deploy (ADR-0042). This is
 * `components/admin/nav.ts` with a query behind it.
 *
 * `cache()` is what makes the header and the footer one query: `caller` is
 * not memoised on its own (`trpc/server.tsx` wraps only `getQueryClient`), so
 * each calling it directly would issue the read twice per render. Both call
 * this; neither layout reads anything or passes props.
 *
 * A database read, not a Request-time one, so it does not dynamise the group
 * (ADR-0034, ADR-0035). It does put a reachable database in `next build`.
 */
export const getRootCategories = cache(() => caller.categories.shop.roots());
