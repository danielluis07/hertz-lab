# 34. The shop frame resolves the visitor on the client

Date: 2026-09-08

## Status

Accepted

## Context

`components/shop/` carries two per-visitor affordances: a cart count badge and
an account affordance. Both want to know who is looking. The frame is rendered
by `app/(shop)/layout.tsx`, which wraps the two routes the store most wants to
serve from cache — `/` and `/produtos` — plus the five institucional pages.

At this repo's configuration the tension is binary, and #86 and #99 measured it
rather than reasoned about it. `next@16.3.4` runs with `cacheComponents` **off**
(ADR-0031). A Request-time read in a `layout.tsx` opts the **entire route** into
dynamic rendering — the layout and every page beneath it. `<Suspense>` does not
buy a static shell at this configuration; that behaviour belongs to Cache
Components, which ADR-0031 declined. The `next build` route table confirms it:
a session read in `app/(shop)/layout.tsx` takes the non-admin static count from
**8 to 1**, and the promise-passing `<Suspense>` form produces a
**byte-identical** table. There is no middle ground to find.

So either the `(shop)` layout does not read the session on the server, or the
group is dynamic. `STOREFRONT.md` asserted both halves and settled neither.

ADR-0006 is the neighbouring constraint and it is worth being precise about why
it does not decide this. It forbids a *guard* in a layout, because a layout does
not re-render across sibling navigations and a guard that runs sometimes is not
a guard. A read for display is not a guard: a stale cart badge is a cosmetic
defect, not a hole. ADR-0006's reasoning does not reach this decision, and this
ADR does not extend it.

Three facts in the code decided it, none of which is in any document.

**There is no guest Cart.** `db/schema/commerce.ts` declares `cart.userId` as
`notNull().unique()` against `user.id` — "Exactly one per User." #89 reached the
same place from the other direction: `cart` runs on `protectedProcedure` because
`CONTEXT.md` rules out guest checkout. A logged-out visitor therefore does not
have an empty cart; they have no cart. The badge is *structurally* absent for
them, not merely unknown.

**Logged-out visitors never reach the cart.** `proxy.ts` already matches
`/carrinho` and `/checkout` and redirects to `/login`.

**Admin already solved this problem the same way.** ADR-0015 has the admin
header read its session through `authClient.useSession()` in the smallest leaf
that needs it, accepting an empty first paint with a fixed-width slot rather
than a layout shift — and admin had nothing to lose, since ADR-0006 makes every
admin route dynamic regardless.

Put together: a server session read in the shop frame would spend every static
route in the group to render an affordance that, for the logged-out majority the
cache exists to serve, has nothing to say.

## Decision

**`app/(shop)/layout.tsx` never reads the session. The frame resolves the
visitor on the client, in the smallest leaf that needs it.**

The general rule this expresses, which outlives the two affordances that
prompted it:

> **Nothing rendered inside a cached shop route may vary per visitor on the
> server.** The ISR entry is one document served to everyone; anything that
> differs between two visitors resolves after hydration or does not exist.

Concretely:

- **The cart icon-link is static frame markup** — always present, always the
  same size, `href="/carrinho"` for everyone.
- **The badge renders nothing until the count resolves and is non-zero.** It is
  a separate absolutely-positioned element, so it never occupies layout and its
  appearance cannot shift anything. It does not render `0`: for a logged-out
  visitor that is false, and a skeleton pill would flash on every page load for
  the majority who will never see a number.
- **The badge reads `trpc.cart.get` with `useQuery`, deriving the integer
  through `select`.** There is no `cart.count`. A second key is a second thing
  every add-to-cart mutation must invalidate, and the failure when someone
  forgets is a badge that disagrees with the page it links to — silent, and
  precisely the bug the badge exists to prevent.
- **The badge's query is gated on the session** (`enabled: !!session`), so a
  logged-out visitor fires no cart request at all. `cart.get` is a
  `protectedProcedure`; ungated it could only ever return `UNAUTHORIZED`.
- **The account affordance is a client leaf** calling `authClient.useSession()`,
  swapping between an `Entrar` link and a menu carrying the name and `Sair`.
  A fixed-width slot holds its place. The cheaper alternative — a static
  `href="/minha-conta"` link for everyone, leaning on the proxy to redirect —
  was rejected because a storefront header that never offers to sign you in
  reads as broken.

The two leaves both call `authClient.useSession()` directly. No context, no
prop drilling: Better Auth's session is a single nanostores atom per client
instance, with in-flight sharing and mount dedupe, so two subscribers cost one
fetch.

**`(account)` renders the shop frame; `(auth)` does not.** `/minha-conta` is a
storefront destination and takes the header *and* the footer.
`app/(account)/layout.tsx` imports `components/shop/` directly rather than the
group being nested under `(shop)`. `(auth)` keeps its own bare layout: sign-in
is the one place the store deliberately stops offering to sell.

### What this narrows

**ADR-0032** says the Cart is read through `prefetch`/`load`, naming *"the
header badge that has to move the instant a line is added."* The decision above
makes that impossible in the frame, and the fix is a narrowing rather than a
reversal. ADR-0032's rule — *a query is hydrated iff a shopper's own write can
change it* — stays exactly true, and the Cart is still the hydrated query. What
is added:

> **Hydration is a property of a page, never of the frame.** A frame component
> reading a hydrated query reads it cold everywhere except the one page that
> prefetches it.

So the badge uses `useQuery` while `/carrinho` uses `prefetch` +
`useSuspenseQuery` over the same key. This keeps ADR-0011's test — *prefetched
iff a client component calls `useSuspenseQuery`* — literally intact rather than
bending it, because the badge does not call `useSuspenseQuery`.

**ADR-0015** says *"A frame folder is imported by its own route group's layout
and by nothing else; that single-owner property is what keeps it out of the
dependency graph the modules form."* `(account)` importing `components/shop/`
breaks that clause as written. It is narrowed to:

> **A frame folder's owners are route group layouts, and it may have more than
> one.** What keeps a frame out of the module dependency graph is that every
> importer is a route group layout — not that there is exactly one.

The property ADR-0015 was protecting survives untouched: no module imports
`components/shop/`. `(auth)` declining the frame is what shows this is a choice
each group makes, not something inherited.

## Consequences

The seven statically-rendered non-admin routes survive, and `/produto/[slug]`
and `/produtos/[...categoria]` remain free to become static once
`generateStaticParams` lands (#101) — the frame is no longer what would stop
them. This is the whole return on the decision, and it is worth naming that it
is smaller than it first looks: seven routes, of which `/` is the one that
matters commercially.

**The price is paid in first paint, for signed-in shoppers only.** A returning
shopper loads `/` and sees the header without their name and without their cart
count, both arriving a moment later. The fixed-width slot and the
non-layout-occupying badge mean nothing moves when they do, but the gap is real
and it is on the store's front door. This was chosen over the alternative —
every visitor waiting on a dynamic render — and if it ever reads as unacceptable
the honest response is to reopen ADR-0031, not to quietly add a session read to
the layout.

**A cost this decision exposes rather than creates:** `lib/auth.ts` sets no
`session.cookieCache`, so every `useSession()` mount is a real
`/api/auth/get-session` round-trip, and for a signed-in visitor that is a
database query on every load of an ISR-cached route — the frame reintroducing
per-visitor cost behind the cache this ADR just protected. Enabling
`cookieCache` is the fix and is deliberately **not** decided here: it is a
change to global auth configuration, it changes admin's session freshness too,
and it trades a staleness window for the round-trip. Tracked separately.

**The rule is what to enforce, not the two affordances.** The next per-visitor
thing someone wants in the frame — a "recently viewed" strip, a locale banner, a
returning-shopper greeting — meets the same rule and gets the same answer. A
proposal to server-render one of them is a proposal to make the storefront
dynamic, and should be read as that rather than as a small addition.

**`(account)` importing the shop frame makes the two groups' headers move
together by construction.** A change to `components/shop/site-header.tsx` lands
on `/minha-conta` too, which is the intent. The corresponding risk is that
`components/shop/` now has two callers and can drift toward serving both, which
is the growth ADR-0015 warned about; the test it gives is unchanged — anything
owning data or a rule of its own is a module and gets composed in.

**Two owners means `components/shop/` may not use
`useSelectedLayoutSegments()`.** ADR-0015 names this hazard precisely — the hook
returns the segments below *the layout that renders it*, so a frame component
reading it "works because it is rendered inside `app/(admin)/layout.tsx` and
would silently misread one segment over if it were rendered from a page." The
same component mounted by two different layouts hits the same failure: under
`app/(shop)/layout.tsx` the segments start at the shop route, under
`app/(account)/layout.tsx` they start at `minha-conta`. ADR-0015 relied on the
single-owner rule to forbid the move that breaks the hook; narrowing that rule
removes the protection, so the constraint is stated here directly instead. If
the shop header ever wants active state on its Category links, it reads
`usePathname()` and matches on the full path, which is owner-independent.
