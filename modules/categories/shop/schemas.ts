import { z } from "zod";

/**
 * `categories.shop.bySlug`'s input: the **last** segment of the Category
 * route's path (`categorySlugFromPath`). Which Category the whole path names
 * is decided by the page against the row, not here (ADR-0043).
 */
export const categoryBySlugInputSchema = z.object({ slug: z.string().min(1) });
