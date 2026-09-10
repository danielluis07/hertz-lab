import "server-only";

import { eq } from "drizzle-orm";
import { product } from "@/db/schema";

/**
 * What a shopper may see: only `active` Products, ever (`docs/MODULES.md`).
 * Every shop query `and()`s this in, so there is one place to grep and no
 * view, middleware or structural machinery for what is a `where` clause.
 *
 * A clause and not a pure rule, which is why it lives in `server/` rather than
 * at the module root; ADR-0030 is what lets `cart`, `wishlist` and `checkout`
 * import it. The partial `product_active_idx` is built over the same predicate.
 */
export const visibleProduct = eq(product.status, "active");
