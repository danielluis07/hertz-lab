import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields, adminClient } from "better-auth/client/plugins";
import type { auth } from "@/lib/auth";

export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>(), adminClient()],
});

/**
 * The two Better Auth shapes the whole app speaks. `Session` is inferred from
 * the client above; `UserRole` mirrors the `role` additional field declared on
 * `auth` in `lib/auth.ts`. Both are shapes, so they stay with the global Better
 * Auth infrastructure they describe rather than in a folder named for a
 * category of thing (ADR-0007, ADR-0008).
 */
export type UserRole = "admin" | "user";

export type Session = typeof authClient.$Infer.Session;
