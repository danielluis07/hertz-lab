import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import { relations } from "@/db/relations";
import { env } from "@/lib/env";

const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

export const db = drizzle({ client: pool, relations });

/**
 * A transaction handle, derived from `db` so it cannot drift from the driver.
 *
 * **A shape, which is the only reason it may be global** (ADR-0007): it says
 * what a value *is* and knows nothing about what any module does inside one.
 * The callers are the functions a procedure hands its open transaction to, so
 * that a lookup sees what that write has done so far — every one of them a
 * module's own `server/` code.
 *
 * It lived as a private copy in `products/server/rating.ts`, then in
 * `products/server/queries.ts`, and #61 was about to write a third in
 * `categories/server/queries.ts`. Promote on the second caller, never on the
 * first (ADR-0007) — this is that, one caller late.
 */
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
