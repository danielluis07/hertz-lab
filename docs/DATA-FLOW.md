# Data flow

How a page gets its data, and who owns the boundaries around it.

This file has two halves. The first is the **read path**: which module a
procedure belongs to is settled by `docs/MODULES.md`; how a procedure reaches
the database is ADR-0010; the rule that decides what gets shipped to the
browser is ADR-0011, and the first half is that rule applied.

The **write path** is the second half of this file. Every write is a tRPC
mutation (ADR-0012), and how a failure becomes pt-BR copy is ADR-0013.

# The read path

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

---

# The write path

Every write is a tRPC mutation (ADR-0012). There are no Server Actions, and
`refresh()` from `next/cache` — which only works inside one — is unreachable
here.

## Three tiers, and who owns each

A mutation has three places to hang behaviour, and **all three fire, in order,
adding rather than replacing**: the `MutationCache` config, then the hook's own
options, then the object passed to `mutate()`. That they are additive is what
lets the layers stay separate.

| Tier | Lives in | Owns |
| --- | --- | --- |
| `MutationCache` | `trpc/query-client.ts` | the pt-BR error toast, for every write in the app |
| `mutationOptions` | the module's mutation hook | invalidation, the success toast |
| `mutate(vars, {…})` | the component | navigation |

The split between the last two is **facts about the write** versus **facts about
the surface**. `products.admin.archive` says *"Produto arquivado."* whether it
was fired from a table row or from a detail page, so that sentence belongs with
the write. Where the Admin goes next genuinely differs per surface.

A hazard forces that split rather than merely suggesting it: the third tier is
guarded by `if (this.#mutateOptions && this.hasListeners())`, so a **call-site
callback does not run if the component has unmounted**. Anything that must
happen regardless of what the UI did belongs in the hook.

## The mutation hook

Each write gets one hook, in the audience's `hooks/` folder, named for the verb:

```ts
// modules/products/admin/hooks/use-archive-product.ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";

export const useArchiveProduct = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.products.admin.archive.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.products.pathFilter());
        toast.success("Produto arquivado.");
      },
    }),
  );
};
```

A hook exists because the invalidation set is a **rule about the module**, and
ADR-0007 keeps rules out of the global layer while `docs/CONVENTIONS.md` keeps
them out of `.tsx` files. It owns the mutation, its invalidation and its success
copy — and nothing else. Confirmation, navigation and form wiring stay at the
call site.

`mutationOptions` reserves only `mutationKey` and `mutationFn`, so every
lifecycle hook is free to use.

## Invalidation

**A write invalidates its own module's path.**

```ts
queryClient.invalidateQueries(trpc.products.pathFilter());
```

This reads far blunter than it behaves. `invalidateQueries` marks every matching
query stale but **refetches only the *active* ones** — those a mounted component
is observing. On an admin page that is one or two queries, not the forty entries
the products cache has accumulated across filter combinations. Targeted
invalidation buys almost nothing here and is the thing that silently rots the
first time a procedure is added to the module and nobody updates the list.

`docs/MODULES.md` nested the audience axis inside `server/` partly for this:
`trpc.products.pathFilter()` reaches both audiences, `trpc.products.admin`
reaches one. Prefer the module path — a write that changes what a shopper sees
should invalidate the shop's view of it too.

**A second module's filter is named only where the write demonstrably changed
that module's data.** The canonical case is a Review write also invalidating
`products`, because ADR-0004 denormalises the rating onto the Product. ADR-0009
says which way that may point: the foreign key's direction is the dependency's
direction, so `reviews` may reach into `products` and never the reverse.

## No optimistic updates

**Admin surfaces do not use optimistic updates.** This is a decision, not an
omission, and "admin should feel snappier, add optimistic updates" is the
plausible-sounding change that is not wanted.

The tRPC options proxy contributes nothing to them — no `setData` or `cancel`
equivalent — so it is plain TanStack v5: `onMutate`, `cancelQueries`, snapshot,
rollback. The cost of doing that correctly scales with the number of distinct
cached inputs, and a filterable admin list has one cache entry per
`{page, perPage, search, sortBy, sortOrder, status, categoryId, …}` combination.
A correct rollback therefore needs `getQueriesData` (plural) plus an updater that
reproduces the server's sort, filter and pagination **in the browser** — a second
implementation of the query, which goes stale the first time a filter is added
and fails in a way no test will catch.

Against that: an Admin editing a Product tolerates a spinner, and admin is a
low-traffic internal surface. Revisit only if a specific surface demonstrates the
need, and revisit it for that surface alone.

## After the write

The two mechanisms are not interchangeable, and ADR-0011 already decided which
data lives where. Queries a client component reads with `useSuspenseQuery` live
in the TanStack cache; anything the page read through `caller` lives in the RSC
payload. `invalidateQueries` cannot touch the second, and `router.refresh()`
cannot touch the first.

**Navigating away** — create → detail, remove → list:

```ts
mutate(values, {
  onSuccess: (product) => router.push(`/admin/products/${product.id}`),
});
```

`router.push()` alone. Since Next 15 the client cache's `dynamic` staleTime
defaults to `0`, and `next.config.ts` sets no `staleTimes` override, so the
destination's server components re-render on arrival. A `router.refresh()` after
a push is a second render of the page just rendered.

**Staying put** — edit in place, archive from a list. The hook's
`invalidateQueries` has already handled the hydrated queries. Add
`router.refresh()` **only if that page reads something through `caller`** — a
heading, a breadcrumb, a summary count. On a page whose data is entirely
hydrated, `router.refresh()` is pure waste.

## Destructive writes

`ConfirmProvider` wraps the admin layout and gates writes the Admin **cannot
undo from the same screen**.

| Write | Confirm |
| --- | --- |
| `remove` — a Variant, a Specification, an image, an empty Category | yes |
| Admin logout | yes |
| `orders.admin.cancel` — irreversible, and ADR-0003 snapshots make it final | yes |
| `products.admin.archive` — reversible by filtering to archived | no |
| `reviews.admin.moderate` rejecting a Review — re-moderatable | no |
| create, update, publishing a draft | no |

`docs/MODULES.md` notes that `delete` is usually a lie in this domain, so the
`remove` row is rarer than it looks: most "deletion" in admin is archiving, and
archiving does not confirm.

**The provider takes the action.** It owns pending state and closing, including
on rejection:

```ts
await confirm({
  title: "Remover variação",
  message: "Esta ação não pode ser desfeita.",
  action: () => removeVariant.mutateAsync({ id }),
});
```

> **Not yet implemented.** `providers/confirm-provider.tsx` still exposes the
> older `confirm(title, message) => Promise<boolean>` alongside `setPending` and
> `closeConfirm`, which leaves the dialog mounted after a confirmation and makes
> every call site run a four-step sequence — where forgetting `closeConfirm` on
> the error path strands the dialog open forever. The signature above is the
> target; changing it is tracked separately.

## `mutate` or `mutateAsync`

**`mutate` everywhere, except as the `action` handed to `confirm`.**

`mutate` does not reject, so it cannot produce an unhandled rejection. A bare
`mutateAsync` invites one at every call site that forgets a `.catch`, and the
error is already handled — by the global tier, which fires regardless. The
confirm provider is the one place that genuinely needs to await, and it owns the
`catch`.

## Pending state

A component instantiates its hook **once**, so `isPending` is shared by every row
that fires it. Archiving one Product spins every button in the table.

Scope on the mutation's own variables rather than instantiating a hook per row:

```tsx
const { mutate, isPending, variables } = useArchiveProduct();
// …
<Button disabled={isPending && variables?.id === product.id}>
```

The bug is invisible until the table has more than one row, which is to say it is
invisible in exactly the conditions it is written under.

## Errors

The rule is ADR-0013; this is its shape at a call site.

**By default a component does nothing.** The `MutationCache` handler in
`trpc/query-client.ts` toasts a pt-BR sentence for every failed mutation, so a
write with no error handling still tells the Admin it failed. There is no hook to
forget.

**A form intercepts field-attributable errors.** The `errorFormatter` in
`trpc/init.ts` carries two payloads — `data.zodError` from `z.treeifyError` (Zod
4.5 spells it `z.treeifyError()` / `z.flattenError()`, *not* the Zod-3
`error.flatten()` in tRPC's published recipe) and `data.field`, lifted from a
conflict's `cause`. The form turns them into `setError`:

```ts
mutate(values, {
  onError: (error) => {
    if (error.data?.field) {
      form.setError(error.data.field, { message: error.message });
    }
  },
});
```

and the procedure that raised it names its own field:

```ts
throw new TRPCError({
  code: "CONFLICT",
  message: "Já existe um produto com este SKU.",
  cause: { field: "sku" },
});
```

**The global handler stands down whenever `data.field` or `data.zodError` is
present.** The payload's presence *is* the signal that something else will render
it — no `meta` flag, no opt-out. The consequence to accept is that a
field-carrying error thrown by a mutation with no form attached shows nothing at
all.

`data.zodError` is defence in depth rather than the common path: React Hook Form
runs the same `schemas.ts` through its resolver, so a Zod failure normally never
reaches the server. It matters when the two disagree.

Two constraints from the transport are easy to get wrong:

- **`error.data` is genuinely absent on a transport failure.** The code map needs
  a no-`data` entry, not an `error.data!.code`.
- **`error.data.code` is the discriminator, never `error.message`.**

A procedure's pt-BR `message` wins over the code map, except for
`INTERNAL_SERVER_ERROR`, which always uses the map and never shows its message —
that is the code an *uncaught* error arrives as, and its message is an English
leak. `adminProcedure`'s `"Acesso restrito ao administrador"` is the pattern, not
an anomaly.

## Absence, again

The read half's rule has a write-side mirror worth stating together: **reads
resolve to "absent", writes resolve to "refused".** A `byId` procedure returns
`null` and the page calls `notFound()`; a mutation throws a real `TRPCError` with
a code, because a write that changed nothing is a different event from a row that
does not exist.

## Toasts

`sonner`, added through shadcn, with `<Toaster />` mounted once in
`app/(admin)/layout.tsx` beside `ConfirmProvider`. `toast()` is importable
anywhere and callable outside React, which is what lets the `MutationCache`
handler — not a component — raise one.

> **`shadcn add sonner` does not build as generated.** The block imports
> `useTheme` from `next-themes`, which this project does not install;
> `app/globals.css` defines a `.dark` variant but nothing toggles it. Fix it the
> way `components/ui/pagination.tsx` was fixed — edit the generated file, drop the
> `next-themes` import, and leave a comment at the top saying what changed, per
> `docs/CONVENTIONS.md`. Re-running `shadcn add sonner` reintroduces it.
