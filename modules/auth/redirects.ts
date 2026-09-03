import type { UserRole } from "@/types/auth";

/**
 * Where a User lands the moment Better Auth hands back a session. An Admin
 * administers the store and never shops (`CONTEXT.md`), so the two roles have
 * different front doors.
 */
const ROLE_HOME: Record<UserRole, string> = {
  admin: "/admin",
  user: "/",
};

/**
 * `proxy.ts` puts the page a logged-out visitor was denied into `?next=`.
 * Only a same-site path is honoured: an absolute URL, a protocol-relative
 * `//evil.com`, or the backslash variant browsers normalise to one, would
 * turn the sign-in form into an open redirect.
 */
export function isSafeNextPath(next: string | null | undefined): next is string {
  return (
    typeof next === "string" &&
    next.startsWith("/") &&
    !next.startsWith("//") &&
    !next.startsWith("/\\")
  );
}

/**
 * `next` wins when it is safe, because it is where the visitor was actually
 * going. A `user` who was bounced off an `/admin` page is sent back to it and
 * bounced again by `requireAdmin()` — the role gate lives on the page
 * (ADR-0006), not here.
 */
export function postAuthPath(role: UserRole, next?: string | null): string {
  return isSafeNextPath(next) ? next : ROLE_HOME[role];
}
