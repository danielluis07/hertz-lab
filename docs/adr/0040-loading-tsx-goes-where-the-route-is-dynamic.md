# 40. `loading.tsx` goes where the route is dynamic, and nowhere else

Date: 2026-09-09

## Status

Accepted

## Context

`docs/READ-PATH.md` bans `loading.tsx` in admin and declines to decide the shop.
The ban's reason does not reach the shop: a `loading.tsx` "would throw away the
instantly-rendered shell — nav, heading, filter bar — that per-section Suspense
exists to deliver", and ADR-0032 makes a shop read a `caller` call, so **a shop
page awaits its own data before it renders anything**. There is no shell to
throw away. The argument that banned the file in admin is silent here.

That inversion was the ticket's premise and it holds, but it is the weaker of
the two reasons and on its own it only licenses the file rather than placing it.
What places it is prefetching, which nothing in this repo had read:

> Without Cache Components, a static route is prefetched in full, while a
> dynamic route is skipped unless it has a `loading.js` boundary.
>
> — `02-guides/prefetching.md` L31

And the payload, `prefetching.md` L61: with no `loading.js` the prefetch carries
the **entire page** at `staleTimes.static` (5 minutes); with one it carries
**layout to the first loading boundary** at `staleTimes.dynamic`, off by
default.

So the file is not neutral. On a **dynamic** route it converts *no prefetch at
all* into a prefetched fallback and an immediate navigation. On a **static**
route it does the reverse: it truncates a full-route prefetch and discards its
client-cache TTL. The same file is a gain on one half of the storefront and a
regression on the other, and ADR-0035 already sorted the halves — `/`, the five
institucional pages and `/produto/[slug]` are static; `/produtos`,
`/produtos/[...categoria]` and all six `(account)` routes are dynamic.

This works at all only because ADR-0034 forbids a session read in
`app/(shop)/layout.tsx`. `03-file-conventions/layout.md` L322: "**Without Cache
Components:** The navigation will block until the layout finishes rendering, and
the `loading.js` fallback will not be shown." A layout that read the session
would leave the fallback dead on arrival. The two decisions agree without
knowing about each other, which is worth recording because reopening ADR-0034
would silently disable this one.

## Decision

**One rule covers both halves of the app, and admin's ban is a case of it
rather than an exception to it:**

> A dynamic segment shows a fallback while it waits. It uses **`<Suspense>`** if
> anything on it is prefetched, and **`loading.tsx`** if the page awaits
> everything. A static segment uses neither.

Admin is the first branch — it prefetches, so it has a shell that renders in one
round trip, and `loading.tsx` would throw that away. The catalogue is the second
— ADR-0032 makes it `caller`-only, so nothing can render until the data lands
and there is no shell to lose. Same rule, opposite answer, which is why
`READ-PATH.md` needed no correction, only a sibling.

The rule's inputs are ADR-0035's route table and ADR-0032's hydration test, so
the file list is derived, never maintained. Where both are already settled:

- **`app/(shop)/produtos/loading.tsx`** — dynamic, `caller`-only. Covers
  `/produtos` and `/produtos/[...categoria]` beneath it.
- **`/carrinho` gets a `<Suspense>`, not a `loading.tsx`** — the Cart is
  ADR-0032's hydrated query, so it is prefetched and read with
  `useSuspenseQuery`, which ADR-0011 requires a boundary for. This is the
  storefront's **only** per-section Suspense boundary today, and it exists for
  admin's reason, on a shop route.
- **No `app/(shop)/loading.tsx`** — it would reach `/`, the institucional pages
  and `/produto/[slug]`, which is the regression above.
- **No `app/(account)/loading.tsx` at the group.** The group is uniformly
  dynamic but **not uniformly `caller`**: `/minha-conta/perfil`,
  `/minha-conta/enderecos` and `/minha-conta/favoritos` are all surfaces a
  shopper writes, so ADR-0032 hydrates them and they take the first branch. A
  group-level file would discard three shells to serve three pages. The rule
  applies **per segment**, and each account route's per-route issue resolves it
  from that route's own hydration — the input this ADR deliberately does not
  guess.
- `(auth)` gets neither; both routes are static.

**A `<Suspense>` on the shop requires a `prefetch` above it.** A boundary around
a section the page already awaited buys nothing —
`01-getting-started/06-fetching-data.md` L452, on exactly this shape: "However,
the page still waits for the artist data before displaying anything." The only
shape that streams is the promise passed down (`02-guides/streaming.md` L247).
So a boundary appearing on a `caller`-only surface is a mistake, not a
refinement, and the catalogue, the product page, the home page and the
institucional pages have none.

The Wishlist control and the reviews island are ADR-0032's two other hydration
candidates and neither is settled; both are open questions elsewhere, and the
constraint this ADR hands them is in Consequences.

**No per-section error boundary anywhere on the shop, and so no `catchError`
yet.** `READ-PATH.md`'s bar is that partial failure leaves the rest of the page
usable. A failed gallery or buy panel *is* a failed page — the shopper cannot
buy — so the group boundary is right. Related Products was the one candidate and
does not clear the bar: it is below the fold, so deferring it lets the scroll
outrun the stream. `catchError` stays at zero call sites, as in admin.

**Error and not-found placement.** `error.tsx` per route group, as in admin;
`(auth)` authors none, because it has no data read to fail and the root
`app/error.tsx` already covers it. **A segment authors a `not-found.tsx` if and
only if it can call `notFound()`** — which is `/produto/[slug]` (ADR-0033's
archived Product), `/produtos/[...categoria]` (ADR-0041) and
`/minha-conta/pedidos/[id]` (another shopper's Order). A group-level fallback
underneath those would be unreachable code.

**Skeletons.** `READ-PATH.md` puts a skeleton in the module beside the component
it stands in for, because it knows that component's shape. That rule covers
`/carrinho` unchanged — its boundary stands for one component, which owns its
skeleton. It does not cover a `loading.tsx`, whose fallback is **page**-shaped,
so there it bends rather than breaks:
`modules/products/shop/components/product-card-skeleton.tsx` sits beside
`product-card.tsx` as the rule requires, and `produtos/loading.tsx` maps it and
draws the filter-bar bones inline, because *how many cards in what arrangement*
is the route's knowledge and no module's. `(account)/loading.tsx` composes
nothing: one fallback stands for six different pages, so the honest fallback is
a heading and a block, and claiming more shape than that produces the
layout-shift flash a skeleton exists to prevent.

## Consequences

**A bad category is a soft 404, deliberately.** `produtos/loading.tsx` sits above
`[...categoria]`, and the response has therefore begun streaming before the
`notFound()` is reached: `04-functions/not-found.md` L193 — "the response has
already begun streaming as a `200`, and the status can't change once streaming
has started." `03-file-conventions/loading.md` L118 names `loading.tsx` as one
of the things that starts the stream. **Ordering cannot fix this** — the
fallback renders first by construction — so a future reader who moves the
`notFound()` earlier will find it does nothing, which is the whole reason this
paragraph exists.

Accepted because the loss is one status code and not indexing: Next still
injects `<meta name="robots" content="noindex">` (`04-functions/not-found.md`
L13), so the URL is kept out of the index either way. The alternative was to
scope the fallback to `/produtos` alone with a route group
(`01-getting-started/02-project-structure.md` L395) — rejected because it buys
the status code on the route nobody reaches by hand and pays with the prefetch
on the route the home page's Categorias strip links to repeatedly.

**`/produto/[slug]` keeps a real 404, and that is what makes the trade
acceptable.** It is static, so it gets no `loading.tsx`, so ADR-0033's archived
Product still returns a hard 404 on the one route where a stale index entry
costs a sale. `/minha-conta/pedidos/[id]` inherits the soft 404 and does not
care; an account page is out of the index regardless.

**`forbidden.tsx`, `unauthorized.tsx` and `global-not-found.js` are declined**,
each experimental behind a flag at this version (`05-config/01-next-config-js/
authInterrupts.md` L13; `03-file-conventions/not-found.md` L60). This follows
ADR-0031's precedent of refusing a flag rather than building on one, and is
recorded so nobody re-proposes them as free wins. The `(account)` guard's
redirect stays a redirect.

**A prefetch on `/produto/[slug]` would cost ADR-0035's only prerendered
route**, and this is the constraint the two open hydration questions inherit.
The Wishlist control is `protectedProcedure` by nature, and #101 named
`protectedProcedure` as one of the three things that must stay off that page —
`createTRPCContext` returns `{}`, so `baseProcedure` is safe and
`protectedProcedure` reads headers. So hydrating the Wishlist control on the
product page does not merely add a boundary; it converts the store's one
prerendered route to dynamic. Whoever settles that control chooses between a
cold `useQuery` (ADR-0034's badge pattern, which already solved this shape once)
and giving up the prerender. The reviews island escapes this only while it stays
public.

**Adding a `loading.tsx` to a static route is now a reviewable defect** rather
than a matter of taste, and the reverse — a dynamic route without one — costs a
blocked navigation with no feedback. Both follow from ADR-0035's table, so a
route that changes rendering mode changes its boundary files with it.
