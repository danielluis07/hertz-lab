# 37. The session cookie cache serves display, never authorisation

Date: 2026-09-09

## Status

Accepted

## Context

ADR-0034 put the cart badge and the account affordance in client leaves on
`authClient.useSession()`, precisely so `app/(shop)/layout.tsx` never reads the
session and the shop's static routes survive (ADR-0031, ADR-0035). It worked,
and it left a bill.

The frame now calls `/api/auth/get-session` on mount, on every page, for every
signed-in shopper. The route's HTML comes free from the ISR cache and then the
frame issues a database round-trip behind it — the per-visitor cost ADR-0031
exists to avoid, reintroduced one layer down. Nothing else in the read path can
absorb it: ADR-0031 banned `unstable_cache` and this repo issues no `fetch`, so
`session.cookieCache` is the only cross-request cache available to it.

Four facts from `better-auth@1.7.2` shape the decision, and each is checked
against the code rather than recalled:

- **Logged-out visitors are already free.** `getSession` returns `null` before
  any database call when no signed session cookie is present
  (`dist/api/routes/session.mjs` L39-40). This is a signed-in-shopper problem
  only. ADR-0034's gate on the cart query was necessary but is not what makes
  the anonymous path cheap.
- **The cache is opt-out per call.** `getSession` accepts a
  `disableCookieCache` query parameter (`session.mjs` L48, L251), so a single
  call site can take the fresh read while everything else takes the cheap one.
- **The cache does not self-extend.** `refreshCache` defaults to `false`, so at
  `maxAge` the next read goes back to the database. Staleness is bounded by
  `maxAge` and nothing widens it.
- **It busts on token change and on local sign-out**, but it cannot bust on a
  `Sair` from another device or an admin-side revoke — those wait out the
  window.

`user.role` is the sharp edge: `requireAdmin()` reads the session, so a cache
that serves authorisation hands a demoted Admin their old access for the length
of the window.

## Decision

**`session.cookieCache` is enabled, and `getCurrentSession()` opts out of it.**
The cookie serves display; authorisation always pays its query.

```ts
// lib/auth.ts
session: {
  cookieCache: {
    enabled: true,
    maxAge: 5 * 60,
  },
},
```

```ts
// lib/auth-guards.ts
export const getCurrentSession = cache(async (): Promise<Session | null> => {
  return auth.api.getSession({
    headers: await headers(),
    // Authorisation never reads the cookie cache (ADR-0037). Every server
    // reader of the session is a guard: requireAuth, requireRole,
    // requireAdmin, and tRPC's protectedProcedure / adminProcedure.
    query: { disableCookieCache: true },
  });
});
```

`getCurrentSession()` is the single choke point — `requireAuth()`,
`requireRole()`, `requireAdmin()` and `trpc/init.ts` all route through it — so
one parameter exempts every guard in the app, and a future server-side reader
inherits the safe default rather than opting into it.

**The exemption is free.** All 19 admin routes and all 6 account routes are
dynamic (measured in #99); none of them is ISR-cached, so none of them is what
ADR-0031 is protecting. The saving lives entirely on the client frame path,
which is where the cost was.

### The window: 5 minutes

With guards exempt, the blast radius is display only, and smaller than it looks.
A visitor's own `Sair` deletes the cookie locally; a re-login busts it on token
change. What remains is a session revoked or a role changed *elsewhere*, and for
that window the frame shows a stale account affordance whose data reads all
still fail — `trpc.cart.get` goes through `protectedProcedure`, which is fresh.
The worst case is a header that looks signed in above queries that return
`UNAUTHORIZED`. The mundane case is a name changed in `/minha-conta/perfil` not
reaching the header for up to five minutes.

Five minutes is the library default, and it is kept **as a choice**. The frame
issues one `get-session` per full page load, so five minutes already covers a
browsing session's navigations; thirty or sixty would buy a rounding error and
widen the stale-display window against profile edits.

### One configuration, both audiences

`lib/auth.ts` is global and ADR-0027 splits the shop from the admin surface, so
a split here would be the expected move. It is not taken. The only admin-side
reader is `components/admin/admin-user-menu.tsx`, display only by ADR-0015, and
`requireAdmin()` is fresh — a demoted Admin sees their own menu for up to five
minutes and is redirected off every admin page they touch. **This is a case
where the two audiences genuinely share**, recorded so that nobody later reads
ADR-0027 as requiring a split that buys nothing.

### `strategy: "compact"`

The default. Compact is base64url plus an HMAC signature: signed, **not
encrypted**, so the payload — id, email, name, `role` — is readable by anything
holding the cookie. `"jwe"` would encrypt it at a per-request crypto cost. The
payload is the visitor's own data in their own httpOnly cookie, so encryption
defends against no threat this application has, while integrity — the part that
matters, because `role` rides in there — is already covered by the signature.

### `version` is a global bust lever, not per-user freshness

`cookieCache.version` invalidates every cached cookie when its value changes.
It accepts a function, and the function is a trap: it is called with the
**cached** session and user, so `version: (_, user) => user.role` looks like it
detects a demotion and cannot — it computes the expected version from the same
stale row it is meant to catch, and always matches.

Use it as a string, bumped deliberately, to invalidate everyone at once: after
a change to what the payload holds, or after an incident. Per-user freshness is
not expressible here, which is the second reason authorisation reads fresh.

## Consequences

A signed-in shopper's page load costs a signed cookie read instead of a database
round-trip, and the anonymous path was always free. Authorisation costs exactly
what it did before, on routes that were never cached.

The staleness that remains is display-only and bounded at five minutes:
a revoked-elsewhere session, a role change, and a just-edited profile name.

This is not measured. #99 set the precedent that rendering claims here get
measured rather than reasoned about, and that precedent is deliberately not
followed: it was about a route table, a fact the build prints for free that
contradicted a document. There is no equivalent free fact here, the direction of
the inequality is not in doubt, and the honest measurement needs production
traffic this project does not have.

ADR-0034's honest price stands unchanged. The cookie cache removes a database
query from the frame; it does not remove the frame's client round-trip, and a
signed-in shopper's first paint on the store's front door is still the cost of
resolving the visitor on the client. If *that* becomes unacceptable the answer
is still to reopen ADR-0031, not to add a session read to the layout.
