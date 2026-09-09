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

Three blocks. It is a short page, and that is the point.

**1. Hero.** A full-bleed photograph, then a paper panel beneath it inside the
container: display line, one supporting line, and `Ver todos os produtos` — the
page's one vermilion fill, pointing at `/produtos`.

The photograph is `aspect-[4/3] md:aspect-[16/9] max-h-[70svh]`, statically
imported with `priority`. It is the LCP element of the store's most-visited
page. The asset is commissioned at 2400 × 1350 with its subject held centre so
both crops survive; `svh` rather than `vh` because mobile browser chrome makes
`vh` lie, and the cap because an uncapped 16:9 band at 1920 px is 1080 px tall —
a first paint that is a photograph and no words.

**Text never sits over the photograph.** A scrim was considered and rejected:
the panel keeps the warm-paper ground, and paper-on-photo is a contrast failure
that returns the day the asset is swapped.

**2. Categorias.** The root Categories as a full-bleed strip of picture tiles —
the second of the two full-bleed grants in `DESIGN.md`, and the surface the
Category picture exists for.

**3. Novidades.** The newest active Products, one row of the catalogue grid.

**What is deliberately absent.** *Mais bem avaliados* — on a young catalogue it
is empty or identical to Novidades, and a section that repeats the one above it
is worse than no section. *Marcas* — a Brand is filterable, never addressable
(`CONTEXT.md`), so its home is the filter bar, where it does its job. And no
carousel: rotating a hero is the entrance animation `DESIGN.md` bans, wearing a
different name.

## Catalogue — `/produtos` and `/produtos/[...categoria]`

**These are one surface.** The category page renders the identical heading,
filter bar, grid and pagination; the Category is a **fixed** narrowing rather
than a removable chip. Exactly one thing differs: a **root** Category page opens
with a strip of its children, and a **child** Category page does not.

That asymmetry is load-bearing. The header carries flat root links and no
dropdown (below), so the category page is where the second level of the tree is
discovered.

Search lives here too: `/produtos?q=`, never a `/busca` route. Search narrows
the catalogue; it does not deserve a duplicate grid, filter bar and pagination
to change one heading. Params follow ADR-0005 and parse through ADR-0014's
lenient schema.

**Heading.** `/produtos` → *Produtos*. `?q=fones` → *Resultados para "fones"*.
A Category → its name, with its description beneath when it has one.

**The Category picture never appears on the Category's own page.** It appears on
the home strip and on its parent's child-strip, and nowhere else. A banner
photograph directly above a grid of product photographs is one image fighting
another, and the product photography is the one that is selling something. This
looks like an oversight and is not.

**Filter bar.** A client component receiving option arrays as data — ADR-0016:
the list stays server markup, only the filters cross the boundary.

- **Marca** — the whole Brand list. ADR-0025 classifies Brands as bounded, so
  there is no search-inside-the-filter.
- **Preço** — a min/max in reais, converted to cents at the seam.
- **Ordenar** — `?ordenar=`: relevância (offered only when `?q=` is present),
  mais recentes, menor preço, maior preço, melhor avaliados.
- **No Categoria filter.** On `/produtos` the tree is the header's job; on a
  category page it would contradict the fixed narrowing above.

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

No badges, no card shadow, no hover-reveal quick-add, **and no accent**. A grid
of twenty-four cards each carrying a vermilion element is the precise failure
the one-accent-per-viewport rule exists to prevent.

**Mobile.** A `Filtrar` button opens a Sheet holding the filters; **Ordenar
stays outside it**. Sorting is a different act from narrowing — the distinction
ADR-0025 draws for its own reasons — and sort is what a shopper on a phone
reaches for most.

**Empty states.** A filtered result that matches nothing gets one line and a
`Limpar filtros` action. A search that matches nothing echoes the query back.

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
contents and its behaviour.

**Header** — wordmark, flat **root** Category links plus a `Produtos` link, a
search input from `md` (an icon below it), the cart as a plain link with a count
badge, and the account affordance.

**Static, not sticky.** The store is short pages and generous space, and a bar
pinned through every scroll contradicts that on every page.

**No dropdown nav.** With a two-level tree (ADR-0022) the children are one click
away on a page that shows them properly, and a dropdown per root puts focus
management and hover intent on every page to buy discoverability the category
page already provides.

**The cart is a link, not a Sheet.** A slide-over cart is the reflex, and it is
a second cart UI to build and keep in sync for a store that has not shipped its
first. `/carrinho` has to exist and be good regardless.

**The frame resolves the visitor on the client (ADR-0034).**
`app/(shop)/layout.tsx` never reads the session, because a Request-time read
there makes every `(shop)` route dynamic and there is no static-shell middle
ground at `cacheComponents: false` (ADR-0031). So: the cart icon-link is static
markup for everyone; its badge is an absolutely-positioned element that renders
nothing until the count resolves and is non-zero, never `0` and never a
skeleton; the badge reads `trpc.cart.get` with `useQuery` and `select`, gated on
the session, so a logged-out visitor fires no cart request at all; and the
account affordance is a client leaf on `authClient.useSession()` swapping
`Entrar` for a name-and-`Sair` menu in a fixed-width slot. The standing rule is
that **nothing inside a cached shop route may vary per visitor on the server.**

**Who mounts the frame.** `(shop)` and `(account)` — `app/(account)/layout.tsx`
imports `components/shop/` directly and takes the header *and* the footer, since
`/minha-conta` is a storefront destination. `(auth)` does not.

**Footer** — three columns on desktop, stacked on mobile: **Loja** (root
Categories), **Institucional** (the five pages), **Contato** (email, and the one
line about the store). Wordmark and copyright beneath a hairline rule.

No newsletter form — it has no backend, and a dead input is worse than no input.
No payment-method or social icon strip: that is the flooded-badge idiom
`DESIGN.md` rejects.

## Institucional

One shared layout for `/sobre`, `/contato`, `/termos-de-uso`,
`/politica-de-privacidade` and `/trocas-e-devolucoes`: `max-w-prose` centred in
the container, `py-16 md:py-24`, page-heading scale from `DESIGN.md`, and a
prose ruleset scoped to the block. No sidebar, no table of contents.

`/contato` adds a contact block. It does **not** get a form until there is
something behind it.

Nothing linked to these five pages before the footer existed.

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
