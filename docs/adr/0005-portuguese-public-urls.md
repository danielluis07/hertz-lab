# 5. Public URLs are Portuguese; admin and API URLs are English

Date: 2026-09-02

## Status

Accepted

## Context

`AGENTS.md` is unambiguous: all code, comments, and commit messages are in
English, and only user-facing copy is in Brazilian Portuguese. In the App
Router a URL segment *is* a directory name, so a route is both at once — it is
source code a developer reads and a string a shopper reads, types, shares, and
that Google indexes.

Hertz Lab sells to Brazilians. `/produtos/audio/fones-de-ouvido` is what that
audience and that search engine expect; `/products/audio/headphones` is a
storefront that looks translated.

## Decision

Public, shopper-facing routes are named in Portuguese: `/produtos`,
`/produto/[slug]`, `/carrinho`, `/minha-conta/pedidos`, `/cadastro`, and the
institutional pages.
`/login` is the exception: `proxy.ts` already redirects there, and it is a
word Brazilian users read as Portuguese anyway.

`/admin/*` and `/api/*` stay English: `/admin/products`, `/admin/orders`,
`/admin/shipping-methods`. They are internal surfaces with no shopper and no
SEO value, and their segments line up with the table names they administer.

Query parameters follow the segment they hang off — `?marca=`, `?ordenar=`,
`?pagina=` on public routes.

Everything else remains English, including every identifier inside these
files: component names, props, variables, and the `page.tsx` filename itself.
Only the directory names that become URL segments are translated.

## Consequences

This is the single deliberate exception to the English-only rule, recorded
here because it reads as a violation. A future reader seeing
`app/(shop)/produtos/[...categoria]/page.tsx` should not "correct" it — doing
so would break every indexed URL and every link a customer has saved.

The mixed tree also makes the shop/admin boundary visible at a glance: if a
directory is in Portuguese, a shopper can reach it.

The cost is a small translation seam. `slug` values in the database are
already Portuguese, so the URL is Portuguese end to end, but a developer
grepping for "products" will miss the storefront routes and must know to
search "produtos" as well.
