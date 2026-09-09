# The write path

How a change reaches the database, and what the surface does while it does.

Every write is a tRPC mutation (ADR-0012). There are no Server Actions, and
`refresh()` from `next/cache` — which only works inside one — is unreachable
here. How a failure becomes pt-BR copy is ADR-0013.

The other half is `docs/READ-PATH.md`.


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
the write. Where the Admin goes next genuinely differs per surface — and so does
turning `error.data.field` into `form.setError`, which is why the two form
wrappers each carry one call-site `onError` and the hooks carry none.

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
`router.refresh()` **only if that page read something on the server** — a
heading, a breadcrumb, a summary count. On a page whose data is entirely
hydrated, `router.refresh()` is pure waste.

**"On the server" means `caller` *or* `load`, and the second half is the one
that catches people.** An earlier version of this rule said "through `caller`",
which is too narrow: `load` puts its value in the RSC payload *as well as*
hydrating it, and the RSC copy is exactly what `invalidateQueries` cannot
reach. The worked case is `/admin/products/[id]`, where the page `load`s
`byId` for its `<h1>` and the form reads the same query — rename a Product and
save, and the form refetches while the heading keeps the old name until a hard
navigation. So an edit-in-place page that renders *anything* from a server read
adds `router.refresh()`.

The reliable test is not which helper was called but **whether a server
component rendered the value**. `prefetch` alone never does, which is why a page
that only prefetches needs no refresh.

## Destructive writes

`ConfirmProvider` wraps the admin layout and gates writes the Admin **cannot
undo from the same screen**.

| Write | Confirm |
| --- | --- |
| `remove` — a procedure that genuinely deletes a row, such as an empty Category | yes |
| Admin logout | yes |
| `orders.admin.cancel` — irreversible, and ADR-0003 snapshots make it final | yes |
| `products.admin.archive` — reversible by filtering to archived | no |
| `reviews.admin.moderate` rejecting a Review — re-moderatable | no |
| create, update, publishing a draft | no |

`docs/MODULES.md` notes that `delete` is usually a lie in this domain, so the
`remove` row is rarer than it looks: most "deletion" in admin is archiving, and
archiving does not confirm.

**An Image is not on that list**, though an earlier draft of this table put it
there. Removing an Image is a *field edit* on a form, not a write of its own —
see "Images" below and ADR-0018.

**Nor is a Variant or a Specification**, which that draft also had, and the
built module is what settled it: a child row leaving a form array is the same
kind of act as an Image leaving one. It is undone by adding the row back, it is
not written until submit, and confirming it would mean confirming every array
row on the form. The `remove` row above is about a *procedure* that deletes,
which `products` has none of. Where deleting a child is genuinely refused — a
Variant an Order references — the refusal comes back from `update` at submit and
lands on the field, which is a better answer than a dialog asking a question the
Admin cannot yet be told the answer to.

**The provider takes the action.** It owns pending state and closing, including
on rejection:

```ts
confirm({
  title: "Remover variação",
  message: "Esta ação não pode ser desfeita.",
  action: () => removeVariant.mutateAsync({ id }),
});
```

**The call is not awaited, and `confirm` returns nothing.** Handing the action
over is what removes the question a call site used to answer for itself; a
promise back would re-open it, and one that settles on cancel as well as on
success would say nothing useful anyway. The dialog closes when the action
settles either way — a rejection is already reported by the global tier above.

The provider refuses to close while the action is in flight, so a dismissal
cannot leave the write running behind a closed dialog.

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

## Images

An Image is the one thing on an admin form that does not travel through the
mutation carrying it. The rule is ADR-0018; this is its shape at a call site.

**The file goes to S3 before the row exists.** Selecting a file calls
`trpc.products.admin.createImageUpload({ contentType, size })`, which returns
`{ key, url }`; the browser PUTs the file to `url` and keeps `key`. The key is
an ordinary React Hook Form value from that point on, so `create` and `update`
see an identical images array and submit stays **one mutation** (ADR-0016).

```tsx
// The tile's own state, not the form's: only the key reaches the form.
const { mutateAsync: createUpload } = useCreateImageUpload();

const { key, url } = await createUpload({ contentType: file.type, size: file.size });
await putWithProgress(url, file, setProgress); // XHR — see below
append({ s3Key: key, altText: "", variantId: null });
```

**What the form sends, and what it never sends.**

| Field | Client | Server |
| --- | --- | --- |
| `s3Key` | from `createImageUpload` | `stat`ed on write; missing, oversized or wrong-typed is refused, naming `images.<i>.s3Key` |
| `position` | — | derived from array index |
| `altText` | required, pt-BR, non-empty | schema rule (ADR-0017: tested) |
| `variantId` | **array index**, on create and update alike | index resolved inside the transaction |

The index is the trap. On create the Variants have no ids yet, so a tile cannot
hold a `variantId`; it holds the position of its Variant in the form's variants
array, and the write resolves it after the inserts. **Update keeps the index
too**, which an earlier version of this table had as "real id on update": one
shape for both payloads is what keeps the form body one file, and the edit
form's `defaultValues` therefore convert ids back to indices on the way in
(`admin/form-values.ts`). Empty means what the nullable column means — the shot
belongs to the Product, not to one Variant.

The cost of the index is that removing a Variant re-points every tile above it,
and the form pays it where it can see it: removing a Variant row rewrites the
affected tiles, and a shot of the Variant that just left becomes a shot of the
Product as a whole. The write cannot catch this — by the time the payload
arrives the index it holds is a valid one.

**Progress is determinate, and that forces XHR.** `fetch` reports nothing
between "sent" and "done"; only `XMLHttpRequest` exposes `upload.onprogress`. A
tile shows a `URL.createObjectURL` preview immediately with a bar over it.
**Submit is disabled while any upload is in flight**, with pt-BR text saying why.

> **The global error net stops here.** ADR-0013 covers every *mutation*, and the
> S3 PUT is not one — `MutationCache.onError` never sees it. `createImageUpload`
> is covered; the upload it authorises is not. A failed tile renders its own
> error with a per-file **Tentar novamente** and raises **no toast**: the
> recovery is item-scoped, and a second home for pt-BR copy is the thing
> ADR-0013 exists to prevent.

**Removal.** Removing a tile whose key was never persisted deletes the S3 object
immediately, through `discardImageUpload` — that is the one orphan we can see,
so we take it. Removing a persisted one is just an array element leaving the
form; the `update` that writes the shorter array deletes the object **once it
commits** — after the transaction, never inside it, because `client.delete`
cannot roll back and a rolled-back Product pointing at deleted objects is the
broken photograph orphans are spent to avoid (ADR-0018 records this under "As
part of the write"). Neither goes through `ConfirmProvider`.

**Orphans are tolerated.** An abandoned form leaves an unreferenced object in
the bucket. There is no sweep, because there is no scheduled runner to run one —
ADR-0018 records the trigger that would reopen it.

## Absence, again

`docs/READ-PATH.md`'s rule has a write-side mirror worth stating together: **reads
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
