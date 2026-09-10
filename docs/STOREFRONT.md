# Storefront

What is **on** each page of the `(shop)` route group: which surfaces exist,
what blocks each one holds, in what order, and what feeds them.

`DESIGN.md` decides what those blocks may look like — tokens, type scale, the
one-accent rule, borders over shadows, near-zero motion. This file does not
repeat any of it and never overrides it. **`STOREFRONT.md` says what is on the
page; `DESIGN.md` says what it may look like; the builder decides the rest.**

## The governing choice: nothing here is curated

Every section's content is a **derived query**. There is no `featured` flag, no
banner table, and `category.position` stays deleted (`db/schema/catalog.ts` —
the column was removed precisely because nothing ever wrote it). A section that
cannot be expressed as a query against the Catalog does not exist on these
pages.

The single exception is the **hero photograph**, which is a committed static
asset rather than Catalog data. That exception is ADR-0028, and it is the only
one.

This is a decision about a young catalogue, not a permanent one. Adding
curation later is a contained migration plus an admin surface; it is
deliberately not smuggled in through a hardcoded slug in a constants file.

## Home — `/`

Six blocks, in this order: **Hero → Categorias → Promoções → Mais vendidos →
Novidades → Mais bem avaliados**.

**1. Hero.** A committed static photograph followed by a separate text panel
holding the page heading, one supporting line, and one primary link to
`/produtos`. Text never overlays the photograph. The image is imported
statically, rendered with `next/image`, marked `preload`, and given an explicit
responsive `sizes` value because it is the page's LCP element. It has `alt=""`:
the separate heading and supporting line carry the message, so the photograph
is decorative. ADR-0028 owns the asset and its safe crop; the route contract
owns only these non-visual loading and accessibility constraints.

**2. Categorias.** `categories.shop.roots()` returns the root Categories,
alphabetically ordered as ADR-0042 specifies. Each result is one link to
`/produtos/<root-slug>` with its visible name and, when present, its square
decorative picture. The picture has `alt=""`; the link text is the accessible
name. A missing picture is omitted rather than replaced (ADR-0021).

**3–6. Product previews.** Each section renders at most four shared
`ProductCard` instances from a bare `ProductCardRow[]`, links to the full
catalogue view below, and disappears when its result is empty:

| Section | Full view | Derived order |
| --- | --- | --- |
| Promoções | `/produtos?promocao=1&ordenar=maior-desconto` | active Products whose price-driving lowest-priced Variant has `compareAtPriceAmount > priceAmount`; largest relative reduction, then newest, then id |
| Mais vendidos | `/produtos?ordenar=mais-vendidos` | active Products with positive lifetime sold units from Orders currently in `paid`, `processing`, `shipped`, or `delivered`; units, then newest, then id (ADR-0047) |
| Novidades | `/produtos?ordenar=recentes` | active Products; newest, then id |
| Mais bem avaliados | `/produtos?ordenar=avaliados` | active Products with at least one approved Review; rating average, rating count, newest, then id |

The four sections contain no duplicate Product. Page order is precedence:
Promoções claims its four first, Mais vendidos excludes those ids, Novidades
excludes both earlier sets, and Mais bem avaliados excludes all three. Each
later read backfills with its next eligible Product rather than returning a
short row merely because an earlier section used one.

The Products shop router exposes four semantic `baseProcedure` reads:
`promotions()`, `bestSellers({ excludeProductIds })`,
`newest({ excludeProductIds })`, and
`topRated({ excludeProductIds })`. Each owns its ordering and hard limit of
four and returns `ProductCardRow[]`; none accepts a page size and none returns a
`total`. The page calls them through the server `caller`. It starts
`categories.shop.roots()` and `products.shop.promotions()` together, then runs
the remaining Product reads in section order because each input depends on the
ids already returned. A `products.shop.home()` procedure is rejected: page
composition belongs to the route, while each reusable ranking belongs to the
Products module.

The full catalogue grows three public values to reproduce these sections:
`promocao=1`, `ordenar=maior-desconto`, and `ordenar=mais-vendidos`.
`promocao` is a filter, not a new route; values other than the literal `1`
parse as absent. The catalogue's `avaliados` and `recentes` sorts remain the
full views for the other two sections.

`/` remains a static ISR route. The database reads do not use a Request-time
API, so changing Categories, Products, approved Reviews, or an Order's counted
status can reach the page without a deploy through the write-side
`revalidatePath("/")` obligations in ADR-0036 and ADR-0047. The committed hero
and its copy change only with a deploy.

**What is deliberately absent.** *Marcas* was considered and declined: a Brand
is filterable, never addressable (`CONTEXT.md`), so it belongs in the catalogue
filter rather than as a home destination. Personalised recommendations and
recently viewed Products require visitor-specific data and conflict with the
static page. Curated collections, urgency blocks, and campaign banners require
the curation schema this document explicitly refuses. A carousel is still
absent: it is multiple competing heroes rather than another derived section.

## Catalogue — `/produtos` and `/produtos/[...categoria]`

**These are one surface.** The category page renders the identical heading,
filter bar, grid and pagination; the Category is a **fixed** narrowing rather
than a removable chip.

Next forces two route files, and what they share is one server component,
`modules/products/shop/components/catalog.tsx`, taking `{ input, categoryIds }`.
It owns the filter bar, the grid, the pagination and the empty state, and issues
its own two reads — `products.shop.list` and `brands.shop.options` — in one
`Promise.all`; ADR-0032 makes both `caller` reads with nothing to hydrate and
nothing for the page to coordinate. Each `page.tsx` owns
`parseCatalogParams` and its heading and nothing else, so `/produtos/page.tsx`
is about five lines. ADR-0011's "the page normalises once" is about the **input**,
which the page still owns.

**The root/child difference is derived, not a branch** (ADR-0043). A root
Category page opens with a strip of its children and shows its whole subtree; a
child page shows itself and no strip — but a child *has* no children, so both
fall out of the same expression: `categoryIds = [id, ...children.map(c => c.id)]`,
and a strip that renders nothing when the array is empty. There is one code path,
and a contract that reads as an `if` invites someone to write one.

The strip matters because the header carries flat root links and no dropdown
(ADR-0042), so the category page is where the second level of the tree is
discovered — which is also why a root page showing only directly-filed Products
would leave the store's main navigation landing on empty grids.

**A Category has exactly one URL.** `category.slug` is globally unique, so the
last segment alone would resolve — and `/produtos/fones`,
`/produtos/audio/fones` and `/produtos/qualquer-coisa/fones` would all render
one Category, permanently, since a Slug never changes. ADR-0043 refuses that: a
child's canonical path is `/produtos/<pai>/<filho>`, the chain is **validated**
against the resolved Category's parent, and anything else is `notFound()` — soft,
per ADR-0040. Three or more segments are refused without a read (ADR-0022).

One read serves all of it: `categories.shop.bySlug` returns the Category with its
parent's slug and its children.

Search lives here too: `/produtos?busca=`, never a `/busca` route. Search narrows
the catalogue; it does not deserve a duplicate grid, filter bar and pagination
to change one heading. Params follow ADR-0005 and parse through ADR-0014's
lenient schema.

**Heading.** `/produtos` → *Produtos*. `?busca=fones` → *Resultados para "fones"*.
A Category → its name, with its description beneath when it has one.

**The Category picture never appears on the Category's own page.** It appears on
the home strip and on its parent's child-strip, and nowhere else. A banner
photograph directly above a grid of product photographs is one image fighting
another, and the product photography is the one that is selling something. This
looks like an oversight and is not.

**Filter bar.** A client component receiving option arrays as data — ADR-0016:
the list stays server markup, only the filters cross the boundary. It composes
the **shared controls**, not the shared bar (ADR-0044): `FilterSearch`,
`FilterSelect` and `FilterRange` carry every rule — debounce, `useOptimistic`,
`replace` not `push`, `data-pending`, and *every filter change drops the page* —
while the arrangement below is the shop's own.

- **Marca** — every Brand **with at least one visible Product**, so the control
  never offers an option that can only return an empty grid. ADR-0025 classifies
  Brands as bounded, so there is no search-inside-the-filter. Sorted with
  `localeCompare(…, "pt-BR")` in the procedure, not `ORDER BY name`.
- **Preço** — a min/max in reais, converted to cents at the seam. Both parameters
  are written in **one** navigation, debounced like the search box; a range holds
  uncommitted keystrokes for the same reason. `preco_min > preco_max` gets no
  special handling and empty-states, per ADR-0041.
- **Ordenar** — `?ordenar=`: relevância (offered only when `?busca=` is present),
  mais recentes, menor preço, maior preço, melhor avaliados, maior desconto,
  mais vendidos. It is a **control**,
  and mechanically it is a filter: written through `buildFilterHref`, dropping
  `?pagina=` like any other. `buildSortHref` has no caller here — that is admin's
  column headers, and a grid has none (ADR-0044).
- **No Categoria filter.** On `/produtos` the tree is the header's job; on a
  category page it would contradict the fixed narrowing above.

**Search defaults to relevância.** `?busca=` with no `ordenar` sorts by
`ts_rank`; everything else defaults to *mais recentes*. Clearing the search while
`ordenar=relevancia` stands resolves back to *recentes* in the schema, so the
control shows the resolved value and the query key cannot fork.

*Melhor avaliados* sorts on the denormalized `rating_average` (ADR-0004), which
is `0` for every Product with no approved Review. On a young catalogue that sort
buries unreviewed items. It is correct, and it is the sort that looks broken
first.

**Grid.** 2 / 3 / 4 columns, `gap-x-6 gap-y-10`, **24 per page** — divisible at
all three widths, so no ragged final row. Pagination is `?pagina=`, numbered,
server-rendered links. Not infinite scroll: it breaks the back button and makes
a result unshareable. Products are unbounded by ADR-0025, so filtering and
pagination are not optional here.

**Card.** Cover, Brand name as meta, Product name, price with `tabular-nums`,
and the struck-through `compare_at_price_amount` when the Variant carries one. A
multi-Variant Product shows its lowest Variant price, prefixed *A partir de*.

It lives at `modules/products/shop/components/product-card.tsx` and takes one
row type, `ProductCardRow`, that **every** caller projects — this grid, `/`'s
four Product previews, and the product page's related section (ADR-0045). The
`A partir de` test is `variantCount > 1`, which is why the row carries a count
the card never prints: ADR-0033's minimum gives the number and not the label.
The Cover join is **inner** — a visible Product always has one, because
publishing an imageless Product is refused (`CONTEXT.md`).

The card carries **no rating**, though *melhor avaliados* sorts by one:
`rating_average` is `0` for every unreviewed Product (ADR-0004), and printing a
zero on twenty-four cards is worse than printing nothing.

No badges, no card shadow, no hover-reveal quick-add, **and no accent**. A grid
of twenty-four cards each carrying a vermilion element is the precise failure
the one-accent-per-viewport rule exists to prevent.

**Mobile.** A `Filtrar` button opens a Sheet holding the filters; **Ordenar
stays outside it**. Sorting is a different act from narrowing — the distinction
ADR-0025 draws for its own reasons — and sort is what a shopper on a phone
reaches for most.

**One tree, arranged responsively — never two behind breakpoint classes.** Two
copies means two `FilterSearch` instances with two independent debounce timers
writing the same parameter, and a resize mid-typing silently drops a keystroke.

**Empty states.** A filtered result that matches nothing gets one line and a
`Limpar filtros` action. A search that matches nothing echoes the query back.

**`Limpar filtros` is `<Link href={pathname}>`** — it clears the entire query
string and keeps the path, which works precisely because ADR-0043 puts the
Category in the path and ADR-0041 puts every view in the query string, so
everything clearable is by construction in one place and the link needs no logic
and no JavaScript. It drops `ordenar` too: a stranded shopper is not protecting
their sort. The search-empty state uses the same link with different copy.

**`?pagina=999` is an empty state, not a 404 and not a clamp** — a query string
is a view (ADR-0041).

## Product — `/produto/[slug]`

The store's most important page, and the one `DESIGN.md` stakes a position on:
Specifications are a feature the shopper came for, not fine print below the
fold.

**Above the fold, two columns.**

*Gallery* — square (ADR-0021), a main image with thumbnails. Images are scoped
to the selected Variant when it has its own, falling back to the Product's.

*Buy panel* — Brand as meta, the `<h1>`, rating with review count linking down
to the reviews, price and compare-at, the Variant selector, stock state,
quantity, and `Comprar` as this page's one vermilion fill.

**The Variant selector renders only when there are two or more Variants.** Every
Product has at least one (`CONTEXT.md`) and most will have exactly one; a select
with a single option is noise.

**Below, in order.** Description → **Especificações**, a two-column table with
values in `font-mono` (mono is for what the shopper compares character by
character) → **Avaliações** → **related Products**.

Related Products are derived: other active Products in the same Category,
excluding this one. **The section is hidden entirely when it is empty.** Falling
back to the same Brand to avoid a blank is padding, and this store does not pad.

There is no wishlist toggle yet. A Wishlist saves *Variants* (`CONTEXT.md`), so
the control belongs against the selected Variant — a fiddly interaction to
design before the account surfaces exist.

### Reviews are a client island

A Review requires a verified purchase: it is always linked to the delivered
Order that entitles its author (`CONTEXT.md`). So the form cannot simply be
rendered — the page must know whether *this* User has a delivered Order
containing *this* Product.

**That check does not make the page dynamic.** The approved Reviews, the specs,
the gallery and the catalogue data all render once for everyone. A small
`"use client"` component asks tRPC the entitlement question after mount.

**This query is deliberately not prefetched and not hydrated.** ADR-0011 says a
query is prefetched and hydrated *iff* a client component calls
`useSuspenseQuery`; this island calls a plain `useQuery` and does neither. That
is not a violation of the ADR — it is a shape the ADR does not describe, because
the answer is per-visitor on a page that must not be. Recorded here so the next
reader does not "fix" it into the prefetch pattern and dynamise the store's most
cacheable route.

**What renders in each state:**

| State | Renders |
| --- | --- |
| Logged out | nothing |
| No delivered Order with this Product | nothing |
| Entitled, none written | the form |
| Written, `pending` | a quiet awaiting-moderation line |
| Written, `approved` | nothing — it is already in the list |
| Written, `rejected` | **nothing** |

The first two are silence because telling a shopper they may not review a thing
they have not bought is noise on a page selling it. The `pending` line exists so
nobody writes the same review twice.

`rejected` is the case that gets missed. `review_user_product_unique`
(`db/schema/content.ts`) still blocks a second attempt, so a form that reappears
here submits straight into a unique-index violation. Silence is also kinder than
a rejection notice.

## The frame

`components/shop/`. `DESIGN.md` leaves its visual design open; this fixes its
contents and its behaviour. Five files, and the split between them is where the
client boundary falls and nowhere else (ADR-0015, narrowed by ADR-0042):

```
components/shop/
  root-categories.ts      the cache()-wrapped read
  site-header.tsx         server
  site-footer.tsx         server
  site-search.tsx         client — useRouter().push
  account-menu.tsx        client — authClient.useSession()
```

**Header** — wordmark, flat **root** Category links plus a `Produtos` link, a
search input from `md` (an icon below it), the cart as a plain link with a count
badge, and the account affordance.

**Footer** — three columns on desktop, stacked on mobile: **Loja** (root
Categories), **Institucional** (the five pages), **Contato** (email, and the one
line about the store). Wordmark and copyright beneath a hairline rule.

No newsletter form — it has no backend, and a dead input is worse than no input.
No payment-method or social icon strip: that is the flooded-badge idiom
`DESIGN.md` rejects.

**Static, not sticky.** The store is short pages and generous space, and a bar
pinned through every scroll contradicts that on every page.

**No dropdown nav, and no active state.** With a two-level tree (ADR-0022) the
children are one click away on a page that shows them properly, and a dropdown
per root puts focus management and hover intent on every page to buy
discoverability the category page already provides. Active state is declined for
its own reason: ADR-0034 forbids `useSelectedLayoutSegments()` here, so it would
cost `usePathname()` and turn the header's links into a client component to
highlight one of them.

**The cart is a link, not a Sheet.** A slide-over cart is the reflex, and it is
a second cart UI to build and keep in sync for a store that has not shipped its
first. `/carrinho` has to exist and be good regardless.

### The nav is read, not declared

**The root Categories come from the catalogue** (ADR-0042).
`components/shop/root-categories.ts` exports
`getRootCategories = cache(() => caller.categories.shop.roots())`; the header and
the footer each call it and React dedupes within the render pass, so the layouts
pass nothing. `caller` is not memoised on its own — `trpc/server.tsx` wraps only
`getQueryClient` — so without the `cache()` the frame would issue the query
twice per render.

`categories.shop.roots` returns roots with their picture, **alphabetically**,
sorted in the procedure with `localeCompare(…, "pt-BR")` rather than by the
database's collation. `CONTEXT.md` gives Categories no inherent order and leaves
it to the surface; sorting in the read is what keeps the header, the footer and
the home strip from disagreeing. There is no cap on the count: if the roots
outgrow the header, the answer is fewer root Categories, not a dropdown.

This is the one place the two frames diverge, and the reason is one line: a nav
entry that is code is declared (`components/admin/nav.ts`), a nav entry that is
a row is read. It costs a reachable database in `next build`, which the five
institucional pages did not previously need.

### The frame resolves the visitor on the client (ADR-0034)

`app/(shop)/layout.tsx` never reads the session, because a Request-time read
there makes every `(shop)` route dynamic and there is no static-shell middle
ground at `cacheComponents: false` (ADR-0031). A *database* read is not a
Request-time read, which is what lets the nav above coexist with seven static
routes.

So: the cart icon-link is static markup for everyone; its badge is an
absolutely-positioned element that renders nothing until the count resolves and
is non-zero, never `0` and never a skeleton; the badge reads `trpc.cart.get`
with `useQuery` and `select`, gated on the session, so a logged-out visitor
fires no cart request at all; and the account affordance is a client leaf on
`authClient.useSession()` swapping `Entrar` for a name-and-`Sair` menu in a
fixed-width slot. The standing rule is that **nothing inside a cached shop route
may vary per visitor on the server.**

**`Sair` does not confirm.** ADR-0012's rule is an admin rule and
`ConfirmProvider` is mounted in `app/(admin)/layout.tsx` only: an Admin mid-edit
loses work, a shopper loses nothing, because a Cart is a permanent row waiting
on the next sign-in. It signs out and lands on `/`, read from
`modules/auth/redirects.ts`.

### Search is a form that writes a URL

`site-search.tsx` is a client component pushing `/produtos?busca=…` through
`useRouter()`. A native `<form action="/produtos">` would ship no JavaScript at
all and was rejected: a document navigation throws away the prefetched
`produtos/loading.tsx` boundary (ADR-0040) on a store whose caching story is
soft navigation between ISR'd routes, and the frame already ships client leaves
for the badge and the account menu.

**The input is uncontrolled and always empty.** It may not read
`useSearchParams()`: on a static route that fails the production build without a
`<Suspense>` boundary, and inside one it client-side-renders the tree up to that
boundary — and the frame mounts on every prerendered route in the store. So on
`/produtos?busca=fones` the heading echoes the term and the input beside it is
blank. This is the header's only concession and it is accepted rather than
engineered around.

### Ownership of the three client leaves

ADR-0015's test — *anything that owns data or a rule of its own becomes a module
and is composed into the frame* — does not answer the three the same way:

| Leaf | Lives at | Why |
| --- | --- | --- |
| Search input | `components/shop/site-search.tsx` | queries nothing; it writes a URL |
| Cart badge | `modules/cart/components/cart-badge.tsx` | a view of an aggregate — the `<NotificationBell />` case |
| Account menu | `components/shop/account-menu.tsx` | no module owns the session; the `admin-user-menu.tsx` precedent |

**Who mounts the frame.** `(shop)` and `(account)` — `app/(account)/layout.tsx`
imports `components/shop/` directly and takes the header *and* the footer, since
`/minha-conta` is a storefront destination. `(auth)` does not. A **page** never
imports the frame, which is why `/`'s Categorias strip issues its own roots read
rather than sharing the memoised one.

## Institucional

One shared layout for `/sobre`, `/contato`, `/termos-de-uso`,
`/politica-de-privacidade` and `/trocas-e-devolucoes`: `max-w-prose` centred in
the container, `py-16 md:py-24`, page-heading scale from `DESIGN.md`, and a
prose ruleset scoped to the block. No sidebar, no table of contents.

**The layout provides the measure and the prose scope, and nothing else.** A
layout cannot know a page's title, so every page owns its own `<h1>`, its own
`metadata`, and all of its copy.

**These five routes have no data flow at all.** The copy is authored as JSX in
each `page.tsx` — not MDX, which is a content pipeline for authors who do not
write TypeScript and there are none here, and not data, which puts prose
somewhere with no formatting and no review diff. They are the only routes in the
store that read nothing of their own, which is exactly why they prerender. The
one thing that reads is the frame above them.

**The three legal pages carry a last-updated line**, authored as a literal in
the page. No shared component and no data source: a date maintained anywhere but
beside the text it describes is a date that lies. `/sobre` and `/contato` carry
none.

`/contato` adds a contact block: the store's email as a `mailto:`, whatever else
is true, and one line pointing at `/trocas-e-devolucoes` — "how do I return
this" being the question a contact page actually receives. It does **not** get a
form until there is something behind it.

The store's contact facts live in `lib/store.ts`, because the footer's *Contato*
column wants the same email. Two callers, no rule, so it is ordinary shared data
rather than frame furniture. They are **plausible fiction**, said so in the
file, so nobody wires a real inbox to an invented address or ships a fabricated
CNPJ believing it.

Nothing linked to these five pages before the footer existed.

## Boundaries and absence

Derivable rather than listed. **A dynamic segment shows a fallback while it
waits — `<Suspense>` if anything on it is prefetched, `loading.tsx` if the page
awaits everything; a static segment neither** (ADR-0040). And **a path is a
resource while a query string is a view** (ADR-0041).

| Route | Rendering | Waiting UI | Can 404 | Empty state |
| --- | --- | --- | --- | --- |
| `/` | static | — | — | sections hide when empty |
| `/produtos` | dynamic | `produtos/loading.tsx` | — | clears the filters |
| `/produtos/[...categoria]` | dynamic | ↑ same file | bad Category (soft) | clears the filters |
| `/produto/[slug]` | static | — | archived / unknown (**hard**) | related hides when empty |
| institucional ×5 | static | — | — | — |
| `/carrinho` | dynamic | `<Suspense>` (Cart) | never | → `/produtos` |
| `/checkout` | dynamic | its own decision | never | → `/produtos` |
| `(auth)` ×2 | static | — | — | — |
| `(account)` ×6 | dynamic | per segment | someone else's Order | → `/produtos` |

`(account)` is uniformly dynamic but **not** uniformly `caller` — `/perfil`,
`/enderecos` and `/favoritos` are surfaces a shopper writes, so ADR-0032
hydrates them and they take `<Suspense>`, while the order list and `[id]` take
`loading.tsx`. Each account route's own issue settles it; there is no
group-level file.

`error.tsx` is **per route group** — `(shop)`, `(account)`, `(admin)`, plus the
root. `(auth)` authors none: it has no data read to fail. `not-found.tsx` is
**per segment**, only on the three that can call `notFound()`, so a group-level
one would be unreachable.

**No per-section error boundary anywhere on the shop, and no `catchError`.** A
failed gallery or buy panel *is* a failed page — the shopper cannot buy — so the
group boundary is right. Related Products was the only candidate and does not
clear the bar: it is below the fold, so deferring it lets the scroll outrun the
stream. The Cart badge and the account affordance are client islands owning
their own pending UI, outside this entirely.

**The spec names an empty state's action; whoever builds the surface writes the
words.** A filtered catalogue clears its filters, a search echoes its query
back, and an empty personal list — Cart, Wishlist, orders — points at
`/produtos`. An unfiltered catalogue with nothing in it is not a state to
design.

`/carrinho` never 404s, for a reason worth keeping: a Cart is a property of the
shopper, not a thing a shopper addresses, so a brand-new account sees an empty
Cart and not a missing page.

## What this file does not decide

The look. Type placement and hierarchy inside a block, spacing within
components, how a category tile or a product card is actually drawn, the hero's
crop composition, hover and focus treatments, how the filter controls are
arranged, the wording of an empty state, and every line of pt-BR copy.

Those belong to whoever builds the surface, bounded by `DESIGN.md`. If this file
starts describing markup, it has drifted.

**Out of scope entirely: `/carrinho` and `/checkout`.** They are flows with
steps and failure states, not compositions, and designing them as a list of
blocks would be the wrong frame. They get their own decision.
