# 35. The shop prerenders one route, and the filter bar is why

Date: 2026-09-09

## Status

Accepted

## Context

ADR-0031 settled *how* the shop caches — rendered routes with ISR, never
queries — and left *which* routes open. Build [#99] measured the answer as it
stands today: 7 of 19 non-admin routes prerender, and both dynamic segments,
`/produto/[slug]` and `/produtos/[...categoria]`, are `ƒ`. The reason was
mundane and is worth stating because the map had it wrong twice: neither route
declares `generateStaticParams`, and a dynamic segment without one is dynamic.
The frame was never what made them dynamic.

Deciding whether to add one exposed a second wrong premise, this time in
`docs/STOREFRONT.md`. The catalogue's filters, sort and pagination live in the
URL — `busca`, `ordenar`, `preco_min`, `preco_max`, `marca`, `pagina`
(`docs/DATA-FLOW.md`) — and ADR-0032 makes a shop query `caller` by default,
because nothing a shopper does *writes* the catalogue. A `caller` read of those
parameters is a server read of `searchParams`, and
`03-api-reference/03-file-conventions/page.md` L119 is unambiguous:
`searchParams` "is a **Request-time API** whose values cannot be known ahead of
time. Using it will opt the page into **dynamic rendering** at request time."

So `generateStaticParams` on the catalogue would buy nothing. The route is
dynamic because of what it *is* — a query result addressed by its query — not
because of anything left undeclared. The same reasoning convicts `/produtos`,
which #99 counted as static only because it is still a stub with no filter bar.

`/produto/[slug]` is the opposite case, and deliberately so. It reads no
`searchParams`, the reviews entitlement is a client island precisely so the page
"must not be" per-visitor (`docs/STOREFRONT.md`), and ADR-0034 moved the frame's
visitor resolution to the client. `docs/STOREFRONT.md` already calls it "the
store's most cacheable route" and it is now the only one that earns the name.

## Decision

**`/produto/[slug]` prerenders. `/produtos` and `/produtos/[...categoria]` are
dynamic, consciously.**

**The catalogue routes declare no `generateStaticParams`, and the absence
carries a comment saying why.** An empty declaration would read as an oversight
to the next reader — the same oversight this ADR exists to correct — and someone
would add one and measure no change.

**`/produto/[slug]` returns an empty array.** Not every slug, not a subset:

```tsx
export async function generateStaticParams() {
  return []
}
```

`03-api-reference/04-functions/generate-static-params.md` lists this as the "all
paths at runtime" shape, and states that an empty array or
`dynamic = 'force-static'` is **required** to revalidate paths at runtime —
omitting the function leaves the route dynamic, which is exactly today's state.
`dynamicParams` stays at its default `true`, so a slug that was never generated
renders on demand and is cached from then on.

Nothing is prerendered at `next build`, and that is the point. Every product
page is cached after one visit, with none of the coupling the alternatives
carry: no rule for choosing a subset that someone has to own and keep true, no
build time that grows with the catalogue, no `DATABASE_URL` at build, and **no
deploy required for a Product published this morning**. A subset rule — best
sellers, recently added — is a query *and* a merchandising policy, and this map
has no owner for either.

**The constraint that keeps the prerender is named, because nothing enforces
it.** `/produto/[slug]` stays static only while it reads no `searchParams`, no
`cookies()`, and no `protectedProcedure`. That last one is concrete rather than
theoretical: `createTRPCContext` returns `{}` (`trpc/init.ts`), so a
`baseProcedure` read is safe, while `protectedProcedure` calls
`getCurrentSession()` and reads headers. The route file carries a comment saying
so. `docs/STOREFRONT.md` already warns that the reviews island looks like
something to "fix" into the prefetch pattern; this is the same hazard with a
larger blast radius, since the fix would be invisible until someone read a build
log.

## Consequences

**The static route count is corrected a second time, and not by the frame.**
ADR-0034 kept the seven static routes by keeping the session out of the `(shop)`
layout. The filter bar takes `/produtos` back out on its own, so the shop's
steady state is `/`, the five institucional pages, and `/produto/[slug]`. Two of
#99's numbers were premises, not measurements, and both are now retired.

**The catalogue has no cache entry, which simplifies invalidation rather than
complicating it.** ADR-0031 worried that `revalidatePath` was coarse because `/`
and `/produtos` re-derive from the same catalogue. They no longer share
anything: `/produtos` re-derives per request. ADR-0036 is short for this reason.

**A shopper's first visit to an uncached product page pays a render.** This is
the honest price of the empty array, and it is paid once per Product per deploy.
The reversal, if traffic ever justifies it, is to return real slugs from the
same function — a change to one function body, not to the route's shape.

**A build no longer proves this route is static.** The choice was deliberate:
asserting the route table in CI is an implementation decision, not a route
contract. `next build` still prints the symbol, so the evidence is there for
anyone who looks; nothing fails if they do not.

[#99]: https://github.com/danielluis07/hertz-lab/issues/99
