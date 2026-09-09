# 42. The shop frame reads its nav; the admin frame declares it

Date: 2026-09-09

## Status

Accepted

## Context

`components/shop/` is the header and footer every `(shop)` route renders inside,
and `(account)` too (ADR-0034). Both halves want the same thing: the **root
Categories**, as flat links in the header and as the footer's *Loja* column.
`app/(shop)/layout.tsx` has both components commented out, so nothing about the
read has ever been settled.

The obvious move is to copy the admin frame, and ADR-0015 argues hard for what
it did there: `components/admin/nav.ts` is **one hand-maintained array**, chosen
over a registry so that "a module gets on the nav when someone adds a line to
it — a deliberate, reviewable act rather than an emergent one." A hardcoded list
of root Categories would dissolve every question below it — no dedupe, no
ordering, no database in the build, no failure mode where the footer takes down
a static page.

The parallel breaks on one fact. **An admin module ships in a deploy; a Category
ships in a form submission.** `CONTEXT.md` has a Category created and deleted by
an Admin — deleted, not archived, because nothing in Order history refers to
one. So a hardcoded shop nav is a list that silently disagrees with the
catalogue the moment an Admin uses the surface that was built for them, and a
header missing a Category that is browsable at its own URL is the kind of defect
nobody reports, because it looks like nothing.

Two facts in the code shape the rest.

**`caller` is not memoised.** `trpc/server.tsx` wraps `getQueryClient` in
React's `cache()` with a comment explaining why, and leaves `caller` a bare
`appRouter.createCaller`. A header and a footer that each call it issue two
queries per render, for real. The ticket's worry was not hypothetical.

**A database read in a layout dynamises nothing.** #86 and #99 measured that a
*Request-time* read — `headers()`, `cookies()`, `searchParams` — in
`app/(shop)/layout.tsx` takes the non-admin static count from 8 to 1. A Drizzle
query is not one. The frame may read the catalogue and the seven static routes
survive, which is the whole reason this decision is available at all.

## Decision

**The shop frame reads its own nav from the catalogue, through one
`cache()`-wrapped call the header and the footer share.**

```
components/shop/
  root-categories.ts      the cache()-wrapped read
  site-header.tsx         server
  site-footer.tsx         server
  site-search.tsx         client — useRouter().push
  account-menu.tsx        client — authClient.useSession()
```

`root-categories.ts` exports
`getRootCategories = cache(() => caller.categories.shop.roots())`. The header and
the footer each call it; React dedupes within the render pass; the layouts write
`<SiteHeader />` and `<SiteFooter />` and pass nothing. The alternative — the
layout reads and prop-drills — was rejected because `(account)` mounts the same
frame, so the read would be copied into a second layout, and because it puts a
data read back into the layout that ADR-0034 just finished emptying.

The symmetry is the point and is worth reading at the path:
**`components/admin/nav.ts` is a literal array; `components/shop/root-categories.ts`
is that same file with a query behind it.** The two frames are one idea, and the
difference between the files is the difference between a module and a row.

### `categories.shop.roots` replaces `categories.shop.tree`

`docs/MODULES.md` named `categories.shop.tree` before any shop surface was
designed. Now that they are, nothing wants two nested levels in one payload: the
frame wants root name and slug, `/`'s Categorias strip wants roots and their
picture, and a root Category page's child strip arrives with that Category's own
`bySlug` read. The frame renders on **every** route in the store, which is the
one place over-fetching is paid repeatedly.

So `categories.shop.roots` exists and `categories.shop.tree` does not. It
returns roots carrying their picture — a nullable text column, free to carry —
so the frame and the home strip share one procedure and the frame ignores the
picture.

**It returns them alphabetically, sorted in the procedure with
`localeCompare(…, "pt-BR")` and not in SQL.** `CONTEXT.md` is explicit that
"Categories have no inherent order […] the order of any list of them belongs to
the surface that renders it", and `category.position` stays deleted, so someone
must choose; alphabetical is the only order that is stable and explicable.
Sorting in the procedure rather than with `ORDER BY name` avoids the database
collation deciding it — under `C` collation "Áudio" sorts after "Zumbidos" — and
the list is bounded by the two-level tree, so an in-memory sort is honest.

Putting the sort in the read is what keeps the header, the footer and the home
strip from disagreeing about Category order, which would read as a bug rather
than as three surfaces each exercising their right to choose.

**There is no cap on the count.** If the roots outgrow the header, the fix is
fewer root Categories — which ADR-0022's two-level tree and `STOREFRONT.md`'s
no-dropdown decision already assume. Named here so that the day it bites, nobody
reaches for a dropdown.

### Where the frame's client leaves live

ADR-0015's test — *anything that owns data or a rule of its own becomes a module
and is composed into the frame* — decides all three, and it does not decide them
the same way:

- **The search input is frame furniture.** ADR-0015's admin search box belongs
  to `products` *because it queries products*. This one queries nothing: it is a
  form that writes a URL, pushing `/produtos?busca=…`. It owns no data and no
  rule, and filing it under `modules/products/` would give that module a
  component that never touches a Product.
- **The cart badge is a `cart` component composed in** —
  `modules/cart/components/cart-badge.tsx`, no audience folder, `cart` being one
  of the six single-audience modules. This is the `<NotificationBell />` case
  verbatim: `cart` is an aggregate with a table and procedures, and the badge is
  a view of it.
- **The account affordance is frame furniture**, on the
  `components/admin/admin-user-menu.tsx` precedent, which reads
  `authClient.useSession()` and sits in the frame. The line that separates it
  from the badge despite both resolving a per-visitor fact: `cart` is a module
  that owns Carts, and **no module owns the session** — Better Auth does.

**`Sair` does not confirm on the shop.** ADR-0012 puts logout among the writes an
Admin cannot undo from the same screen, and `ConfirmProvider` is mounted in
`app/(admin)/layout.tsx` only. The reasoning does not cross the audience line: an
Admin mid-edit loses work, a shopper loses nothing, because there is no guest
Cart to discard (ADR-0034) and a Cart is a permanent row (`CONTEXT.md`) waiting
on the next sign-in. The menu signs out and lands on `/`, read from
`modules/auth/redirects.ts`, which already names `/` as a `user`'s home.

### The search input is uncontrolled and always empty

`use-search-params.md` L181: during a production build, a static page whose
Client Component calls `useSearchParams` **fails the build** without a
`<Suspense>` boundary, and L82: inside one, the client tree up to that boundary
is client-side rendered instead of prerendered. The frame mounts on `/`, on
`/produto/[slug]` and on the five institucional pages — every prerendered route
in the store.

So the header input may not read the current query, and on
`/produtos?busca=fones` the heading echoes the term while the input beside it is
blank. This is accepted rather than engineered around: the only fix wraps the
header in a boundary that makes it CSR on exactly the routes the cache exists to
serve.

It is a **client** component pushing through `useRouter()` rather than a native
`<form action="/produtos">`, which would ship no JavaScript at all. A document
navigation would throw away the prefetched `produtos/loading.tsx` boundary
ADR-0040 just bought, on a store whose entire caching story is soft navigation
between ISR'd routes — and the frame already ships client leaves for the badge
and the account menu, so this costs no new boundary.

The public key is **`?busca=`** (ADR-0005, #89), not `STOREFRONT.md`'s `?q=`.
That conflict is settled here.

## Consequences

**`next build` now needs a reachable database to prerender the five
institucional pages.** `/` already needed one — its Categorias strip and
Novidades are queries — but the institucional five read nothing of their own and
were free. #101 counted "no `DATABASE_URL` at build" among `/produto/[slug]`'s
virtues; that stays true of the route and is no longer true of the build. The
price is accepted because the build already prerenders `/` from queries, and
because the failure it creates is loud: an unreachable database fails the build
rather than shipping a header with no Categories.

**A frame read is on the critical path of every route in the store.** One extra
query per render, paid at revalidation on the static routes and per request on
the dynamic ones. There is no per-section error boundary on the shop
(`STOREFRONT.md`), so a failed Categories read is a failed page — correct, and
the same answer the shop gives everywhere else.

**`/`'s Categorias strip issues its own read** rather than sharing the frame's
memoised one, because a *page* importing `components/shop/` would break
ADR-0015's rule that every importer of a frame folder is a route group layout.
On a static route the duplicate is paid at revalidation. Paying it is preferred
to widening the frame's contract.

**The frame's file count is derived, not budgeted.** ADR-0015 says a sixth file
in `components/admin/` is a smell, and the sentence beside that number is the
actual test — *the frame splits where the client boundary falls, and nowhere
else*. The shop frame has three client boundaries where admin has two, so it
could legitimately have been six files; it is five because the badge belongs to
`cart`. A future addition is read against the rule, not against admin's count.

**Adding a root Category is now one act rather than two**, which inverts the
consequence ADR-0015 accepted for admin ("a module that is built and not listed
is reachable by URL and invisible in the sidebar"). The corresponding new risk is
the opposite one: a Category created by accident appears in the header of every
page immediately. ADR-0023 already requires a Category to be empty before it is
deleted, so the recovery is a delete, and the exposure is the revalidation
window ADR-0036 defines.

**The two frames now differ in a way a reader will notice**, and the reason is
one line: a nav entry that is code is declared, a nav entry that is a row is
read. Anyone proposing to hardcode the shop nav for speed, or to make the admin
nav dynamic for symmetry, is proposing to cross that line and should say so.
