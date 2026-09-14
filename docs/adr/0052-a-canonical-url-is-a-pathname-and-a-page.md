# 52. A canonical URL is a pathname and a page

Date: 2026-09-11

## Status

Accepted

## Context

The catalogue reads six parameters besides its path: `busca`, `marca`,
`preco_min`, `preco_max`, `ordenar`, `promocao`, and `pagina`. Every
combination is a real URL that returns a real 200 with real Products on it, and
a crawler that finds one finds all of them — the filter bar links them.

Left undecided, that produces an unbounded set of near-identical pages competing
with each other and with the Category paths ADR-0043 made canonical. The
question is which of those URLs is allowed to say it is the original, and which
are allowed into an index at all. Both answers are cheap to write and expensive
to change: a URL that has been indexed, ranked, and linked to does not stop
being indexed because a later commit changed its `<link rel="canonical">`.

Three shapes were on the table.

**Full self-canonical.** Every URL canonicalises to itself. Honest, and it mints
a canonical URL per filter combination — the unbounded set, blessed.

**Bare pathname always.** Every catalogue URL canonicalises to the pathname, so
`/produtos?pagina=7` claims its Products live on `/produtos`. They do not. Page
seven's Products appear on no other URL, and this tells a crawler to drop them.

**Pathname plus `pagina`.** Filters collapse, pagination survives.

## Decision

**A canonical URL is a pathname plus `pagina`.** Every other catalogue parameter
is stripped, `pagina=1` is stripped as well, and the pagination control links
page one as the bare pathname. So `/produtos?marca=jbl&ordenar=menor-preco&pagina=2`
canonicalises to `/produtos?pagina=2`, and `/produtos?pagina=1` and `/produtos`
are one URL with one canonical form.

This is ADR-0041 applied to a `<link>` tag rather than to absence. That ADR
settled that **a path segment names a resource and a query string names a view
over a list**; the consequence here is that a view is not a canonical URL,
because it is not a thing — it is a way of looking at one. `pagina` is the
exception that proves it: page seven is not a lens over the catalogue, it is a
disjoint slice of it, holding 24 Products that exist on no other URL. Paging is
where a query string stops describing a view and starts addressing content.

**Index policy follows from the same line.** Indexable: `/`, `/produtos`, every
Category path, every active `/produto/[slug]`, and the five institucional
routes. `noindex, follow` for any catalogue view carrying a filter or a search
term, `pagina` excepted — `follow`, not `nofollow`, because the Products linked
from a filtered view are exactly the Products we want crawled. `noindex,
nofollow` for `/carrinho`, `/checkout`, `/checkout/[id]`, `/login`, `/cadastro`,
and the six account routes: a form is not a landing page.

**An empty view gets no special case.** A filtered view matching nothing is
already `noindex` for carrying the filter. A bare Category path with no active
Products stays indexable, and the reason is not optimism about the catalogue
filling up — it is that the alternative makes `generateMetadata` wait on a
Product count it otherwise never needs, to decide a header for a page nobody has
yet searched for. A route's metadata should not acquire a query in order to
describe its own emptiness.

**`robots.txt` does not disallow the catalogue's query strings.** This looks
like the cheaper way to say the same thing and is the opposite: `Disallow`
prevents the crawl, and a page that is never crawled is a page whose `follow`
never happens and whose `noindex` is never read. The two mechanisms are not
interchangeable — one hides a URL, the other hides a URL's *entry in an index*
while keeping its links. `robots.txt` is therefore reserved for what should not
be fetched at all: `/carrinho`, `/checkout`, `/minha-conta`, `/login`,
`/cadastro`, `/api`.

## Consequences

The rule lives in one builder, in `modules/products/shop/`, beside the
`CATALOG_PARAMS` it has to know about. `/produtos` and `/produtos/[...categoria]`
both call it, which is what keeps them from drifting: they already share their
filter controls (ADR-0044) and their list read, and this is the third thing they
must agree on.

`/produtos` gains a `generateMetadata` and loses its static `metadata` object —
Next refuses both in one segment — because its `robots` value now depends on the
query string. It reads `searchParams`, which it already does for its list, and
the route was dynamic anyway (ADR-0035), so the metadata costs nothing new.

The pagination control's page-one link changes shape: bare pathname, never
`?pagina=1`. A control that emits `?pagina=1` is not a cosmetic inconsistency
here, it is a second URL for the first page of every Category in the store.

Category paths are untouched: ADR-0043 made a Category path a canonical subtree
and the route 404s a path whose parent does not match, so each one is
self-canonical with nothing to strip.

`sitemap.ts` inherits the policy rather than restating it — it lists only what
this ADR made indexable, which is why no account, cart, checkout, or auth route
appears in it, and why no filtered catalogue URL does either.
