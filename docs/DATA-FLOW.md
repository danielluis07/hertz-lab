# Data flow

How a page gets its data, and who owns the boundaries around it.

This file is the **read path**. Which module a procedure belongs to is settled
by `docs/MODULES.md`; how a procedure reaches the database is ADR-0010. The
rule that decides what gets shipped to the browser is ADR-0011, and this file is
that rule applied.

The write path — mutations, invalidation and error copy — is not specified yet.

## Which path a query uses

There are three ways a server component can get data, and the choice is made
**per query, not per page**. A single page routinely uses more than one.

The test is mechanical:

| Does a client component call `useSuspenseQuery` on it? | Does the server component also need the value? | Use |
| --- | --- | --- |
| yes | no | `prefetch(...)` — void, streams |
| yes | yes | `await load(...)` — one fetch, both consumers |
| no | — | `caller.x.y()` |

All three live in `@/trpc/server`.

```tsx
// app/(admin)/admin/products/[id]/page.tsx
export default async function ProductPage({ params }: PageProps<"/admin/products/[id]">) {
  await requireAdmin();
  const { id } = await params;

  // the server needs the name for the heading; the form reads the same query
  const product = await load(trpc.products.admin.byId.queryOptions({ id }));
  if (!product) notFound();

  // only the client table reads this one
  prefetch(trpc.products.admin.variants.queryOptions({ productId: id }));

  return (
    <HydrateClient>
      <h1>{product.name}</h1>
      <Suspense fallback={<VariantTableSkeleton />}>
        <VariantTable productId={id} />
      </Suspense>
    </HydrateClient>
  );
}
```

**`caller` is not "data rendered on the server".** It is data **no client query
exists for** — nothing calls `useSuspenseQuery` on it anywhere, so there is
nothing to hydrate and no reason to pay for dehydrating it.

Anything fetched through `getQueryClient` — which is both `prefetch` and `load`
— is dehydrated by `<HydrateClient>` and shipped to the browser whether or not a
client component reads it. Keeping `caller` for server-only reads is what stops
a page shipping a payload nothing consumes. That is the whole of ADR-0011, and
it is why no further rule about `<HydrateClient>` placement is needed: put it at
the page root, because by construction it dehydrates exactly the set a client
component reads.

`prefetch` is never awaited. Awaiting it would block the shell behind the data
and give up streaming, which is the point of having a boundary at all.

### A note on static rendering

`trpc/server.tsx` used to justify `caller` as being "for static rendering". That
reason does not hold in admin: ADR-0006 puts `requireAdmin()` in every admin
`page.tsx`, `requireAdmin()` reads `headers()`, and so **every admin route is
already dynamic**. Admin has no static/dynamic trade-off to make.

On the shop side that trade-off is real — a product page with no session read
can be static — but `caller` still earns its place there for the reason above,
not for that one. Shop surfaces are otherwise outside what this file specifies.

## Query keys and server/client parity

A tRPC query key is `[path[], { input, type }]`, hashed with `JSON.stringify`.
`undefined` values are dropped from the hash, so `{ search: undefined }` and
`{}` are the same key — and `{ search: "" }` is a different one.

This makes the input object load-bearing for key *identity*. If the server
prefetches with one input and the client builds a subtly different one, the keys
do not match, hydration misses, and the page refetches on mount. Nothing errors;
it is just silently slower.

**The page normalises once and passes the input down as a prop.** The client
component feeds that object straight into `queryOptions` and never derives its
own:

```tsx
const input = normalizeProductsParams(await searchParams);
prefetch(trpc.products.admin.list.queryOptions(input));
return <ProductTable input={input} />;
```

Both sides re-deriving from the URL and trusting a shared normaliser to converge
is the alternative, and it is the one that fails silently — every filter added
later is a fresh chance to diverge. Passing the object makes parity structural:
the client cannot disagree because it never computes one.

Where the normaliser itself lives, and what it does with defaults, belongs to
the search-params spec, not here.

## Boundaries

Suspense and error handling are **not the same granularity** and are not owned
by the same thing.

**Suspense is per data section, owned by the page.** The fallback has to match
the shape of the specific section it replaces, which a shared wrapper component
cannot know.

**Errors are `app/(admin)/error.tsx` by default.** A failed table and a failed
page are the same event nearly always, and the route-level boundary already
handles it. Add a boundary around one section only when partial failure should
genuinely leave the rest of the page usable.

Where a per-section boundary *is* justified, use **`catchError` from
`next/error`**, not a hand-rolled or third-party error boundary:

```tsx
import { catchError } from "next/error";
```

`redirect()` and `notFound()` work by throwing sentinel errors. A plain error
boundary catches them, so wrapping a section in one turns every `notFound()`
inside it into "Algo deu errado". `catchError` is framework-aware and lets the
sentinels through.

### No `loading.tsx` in admin

There is none, deliberately. A `loading.tsx` replaces the **entire** route
segment during navigation, which would throw away the instantly-rendered shell —
nav, heading, filter bar — that per-section Suspense exists to deliver. Since
pages await nothing but their own `load` calls, the shell is available
immediately and only the data sections need to show anything.

### Skeletons

A skeleton belongs to the component it stands in for, in that component's
module: `modules/products/admin/components/product-table-skeleton.tsx` beside
`product-table.tsx`.

It knows that table's column count and widths, which under ADR-0007 is a *rule*
about the shape, not a shape — so it cannot be a global `<TableSkeleton>`. It is
a **sibling file**, not a second export: it is a different component with a
different tree, and the page (a server component) imports the skeleton while the
table is `"use client"`.

`components/ui/skeleton.tsx` stays what it is — the shadcn primitive these are
composed from.

## Absence

**`null` means "this resource does not exist". `[]` means "nothing matched".**

A `byId`-shaped procedure returns `null` rather than throwing `NOT_FOUND`, and
the page turns that into the Next primitive:

```tsx
const product = await load(trpc.products.admin.byId.queryOptions({ id }));
if (!product) notFound();
```

This keeps control flow in `page.tsx`, where ADR-0006 already puts
`requireAdmin()`, and spares every page a try/catch that maps a `TRPCError` code
back into a framework call. It also gives the client path sensible behaviour for
free: a client component reading a nullable result renders an empty state
instead of tripping a boundary.

**A list always succeeds.** An empty result is a valid one — it renders an empty
state, never a 404 — and only a route's own `[id]` segment can produce a `null`.
`/admin/products?categoryId=<gone>` therefore shows an empty list, not a missing
page: a filter is a *view* of a list, not a resource, and the admin's fix is to
clear the filter, which an empty state invites and a 404 does not.

The asymmetry with the write path is deliberate: **reads resolve to "absent",
writes resolve to "refused"**. Mutations keep real `TRPCError` codes.

## The query client

`trpc/query-client.ts` holds three settings that hydration depends on. They look
adjustable and are not.

**`staleTime: 30 * 1000`.** It must be greater than zero. At `0` every hydrated
query is stale the instant it mounts and refetches immediately, throwing away
the server's work and silently doubling every page load. "Admin data should be
fresher, so lower the staleTime" is the plausible-sounding edit that breaks
this. Freshness after a write is the invalidation path's job, not this number's.

**`shouldDehydrateQuery` includes `status === "pending"`.** This is what lets a
voided `prefetch` dehydrate as an in-flight promise and stream. Without it, only
settled queries would cross to the client and `prefetch` would have to be
awaited.

**`refetchOnWindowFocus: false`.** With a 30-second stale window, focus
refetching mostly fires on tab-switches that changed nothing.

## `lib/request-cache.ts`

It does not exist and will not. An older comment in `trpc/server.tsx` referred
to it as the place to wrap `caller` calls for per-request deduplication.

React's `cache` **is** the request cache; a module that re-exports it adds a name
to learn and hides the standard one. Where a module genuinely needs per-request
dedup, it imports `cache` from `react` in its own `server/` file. Under ADR-0010
there is currently nothing to dedup: `createTRPCContext` is already wrapped, and
no query layer exists until a second caller needs one.
