# 6. Authorisation is checked in page.tsx, never in a layout

Date: 2026-09-02

## Status

Accepted

## Context

Three places can guard a protected route, and each looks reasonable:

- `proxy.ts`, which already redirects to `/login` when no session cookie is
  present on `/admin/:path*`
- the route group's `layout.tsx`, the obvious DRY home for a check shared by
  every page beneath it
- each `page.tsx`

The proxy sees only a cookie. `getSessionCookie` tests for the cookie's
presence; it does not validate the session, does not hit the database, and
knows nothing about `user.role`. Today a signed-in *customer* passes the
`/admin` matcher untouched.

The layout is the tempting one, and it is the trap. A layout does not re-render
when the user navigates between sibling routes inside it, so a check that runs
on the first render of `/minha-conta/pedidos` does not necessarily run again on
the client transition to `/minha-conta/perfil`. A guard that runs sometimes is
not a guard.

## Decision

Every protected page calls `requireAuth()` or `requireAdmin()` from
`@/lib/auth-guards` in its own `page.tsx` body, before rendering. No layout
performs an authorisation check.

`proxy.ts` keeps its cookie check and extends its matcher to `/admin/:path*`,
`/minha-conta/:path*`, `/carrinho`, and `/checkout`. Its job is to spare
logged-out visitors a wasted render, nothing more.

Route Handlers and tRPC procedures guard themselves the same way. A page's
check protects the page, not the data it happens to call.

## Consequences

The repetition is the point. One `requireAdmin()` per admin page is more lines
than one in the layout, and a future reader will want to hoist it. Hoisting it
opens the hole this ADR exists to close.

The corollary is that a new protected page is unguarded until someone writes
the call — the check is opt-in, and forgetting it is silent. Adding a page
under `(admin)` or `(account)` is therefore never complete without its
`requireAdmin()` / `requireAuth()` line, and that is what a reviewer looks for
first.

Because `getCurrentSession` is wrapped in React `cache`, calling the guard in
a page that also reads the session costs one database round-trip per request,
not two.
