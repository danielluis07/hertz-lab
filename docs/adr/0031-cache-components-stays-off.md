# 31. Cache Components stays off; the shop caches whole routes, not queries

Date: 2026-09-08

## Status

Accepted

## Context

`next@16.3.4` ships Cache Components behind a single `cacheComponents` flag, and
`next.config.ts` does not set it — the config is one `images.remotePatterns`
entry and nothing else (ADR-0021). Research [#86] read the consequences off the
bundled docs and build [#99] measured them.

The flag gates more than an optimisation. `use cache`, `cacheLife`, `cacheTag`,
`use cache: private` / `remote`, `io()` and the `instant` segment config are all
unavailable without it, and
`03-api-reference/04-functions/unstable_cache.md` says the one remaining
alternative "has been replaced by `use cache` in Next.js 16". Read together,
**this repo has no non-deprecated way to cache a database query across
requests**, which is a real constraint on a storefront whose catalogue changes
only when an Admin publishes.

It also changes what a `<Suspense>` boundary buys. Without the flag, a
Request-time read anywhere in a route dynamises the whole route; the static
shell is a Cache Components feature. #99 measured this rather than inferring it:
a session read in `app/(shop)/layout.tsx` takes the static route count from
**8 to 1**, and the promise-passing form that defers the `await` behind
`<Suspense>` produces a **byte-identical** route table. There is no third form
of the server read that keeps the prerender.

The obvious response — turn the flag on — was measured too, and it is not a
flag. `cacheComponents: true` **fails the build**, in three successive rounds:
every one of the 27 pages behind an auth guard, then both auth pages and the
shared admin breadcrumb (`useSelectedLayoutSegments()` in a client component,
one component but every `/admin/*/[id]` route), then `/produto/[slug]` — a
five-line stub whose only sin is `await params`. Adopting it means deciding, per
route, between `"use cache"`, a `<Suspense>` boundary and `instant = false`. It
additionally requires the Node.js runtime, removes `dynamicParams`, and switches
client navigation to React `<Activity>`, which preserves component state instead
of unmounting — with knock-on effects on dialogs, dropdowns and their tests.

The cost falls in the wrong place. It is a **global** switch, and the admin half
pays it in full for a benefit it does not want: `docs/DATA-FLOW.md` already
records that every admin route is dynamic behind `requireAdmin()`, so admin has
no static/dynamic trade-off to make. The half that would benefit is the shop,
and the shop is currently 19 stub routes.

## Decision

**`cacheComponents` stays off. The Storefront caches rendered routes with ISR,
never queries, and `revalidatePath` is the only invalidation lever.**

Three parts, each load-bearing:

**Whole routes, not queries.** A catalogue route re-derives its whole output
from the catalogue, so caching the rendered route is strictly more than caching
the query behind it — it skips the render too. Route-level ISR works today, is
not deprecated, and needs no migration.

**`revalidatePath`, not `revalidateTag`.** This is the part that is easy to get
backwards. `02-guides/incremental-static-regeneration.md` L290 is explicit that
`revalidatePath` works "regardless of how you retrieve your data in your Server
Component, either using `fetch` **or connecting to a database**". `revalidateTag`
is not equivalent: per the same guide, a tag attaches either to a tagged `fetch`
or to `unstable_cache(fn, keys, { tags })`. This repo reads Drizzle through tRPC
procedures (ADR-0010) and issues no `fetch` at all, so **there is nothing to
tag**. Tag granularity over a catalogue query is reachable only through the
deprecated API.

**`unstable_cache` is banned.** Not discouraged — banned. It is the only way to
cache a query here, and permitting it would quietly resolve the constraint this
ADR exists to record.

**No time-based `revalidate` floor.** Invalidation is on-demand only. A missing
`revalidatePath` after an Admin write should surface as a stale page and get
fixed, not be masked an hour later by a timer. This also keeps the cascade rule
in `02-guides/caching-without-cache-components.md` — the **lowest** `revalidate`
across a route's layout and pages sets the whole route's frequency — from
becoming a trap in a shared `(shop)` layout.

The deployment target is **Vercel**, which is what makes prerendered output and
ISR worth having at all; on a single self-hosted container with no cache
handler, most of this would buy nothing.

## Consequences

**"Every shop route may be dynamic" is now an accepted outcome, in writing.** A
shop route that reads the session on the server is dynamic, and so is every
route beneath that layout. This is the price of the decision and it is paid
consciously here rather than discovered later.

**#87 is genuinely binary and this ADR is why.** Either the `(shop)` layout does
not read the session on the server, or the whole group is dynamic and the seven
static routes become one. The comfortable middle — a static shell with a
per-visitor hole — is the Cache Components behaviour, and it is off.

**The write path grows an obligation.** Any Admin mutation that changes what a
shop route renders must call `revalidatePath` for the affected paths. Nothing in
the type system enforces this, which is exactly why there is no time-based floor
to hide a missed call.

**Invalidation is coarse, and that is accepted.** `revalidatePath` invalidates a
whole route. Since `/` and `/produtos` both re-derive from the same catalogue,
per-query precision would buy nothing real here.

**Regeneration is lazy.** The docs note that `revalidatePath` "invalidates the
cache entries but regeneration happens on the next request", and that the App
Router has no eager equivalent yet. A published product appears on the next
visit to the path, not at the moment of publishing.

**The reversal conditions are named on purpose.** Turn `cacheComponents` on when
a shop read genuinely needs cross-request caching that whole-route ISR cannot
express, or when `unstable_cache` is removed rather than merely deprecated, or
when real traffic makes the static shell worth a migration. Any of those is a
**separate effort with its own map** — it touches the admin half, the auth
guards, the breadcrumb and the navigation model, none of which are storefront
concerns.

[#86]: https://github.com/danielluis07/hertz-lab/issues/86
[#99]: https://github.com/danielluis07/hertz-lab/issues/99
