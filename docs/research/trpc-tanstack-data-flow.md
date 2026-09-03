# tRPC v11 + TanStack Query v5: facts the Hertz Lab data flow rests on

Research for [#14](https://github.com/danielluis07/hertz-lab/issues/14) (child of [#4](https://github.com/danielluis07/hertz-lab/issues/4)).
**Fact-finding only.** Nothing here is a decision; every item is a constraint or capability
that #8 (read path), #9 (write path) and #10 (list inputs) have to design against.

## Scope: exact versions

Everything below is scoped to the versions installed in `node_modules`, verified against
their `package.json`:

| Package | `package.json` range | Installed |
| --- | --- | --- |
| `@trpc/server` | `^11.18.0` | **11.18.0** |
| `@trpc/client` | `^11.18.0` | **11.18.0** |
| `@trpc/tanstack-react-query` | `^11.18.0` | **11.18.0** |
| `@tanstack/react-query` | `^5.102.8` | **5.102.8** |
| `superjson` | `^2.2.6` | **2.2.6** |
| `next` | `16.3.4` | 16.3.4 |
| `react` / `react-dom` | `19.2.8` | 19.2.8 |

### Which API this is — read this before trusting anything else

This repo uses the **options-proxy API**: `createTRPCOptionsProxy` /
`createTRPCContext` from `@trpc/tanstack-react-query` (`trpc/server.tsx:12`,
`trpc/client.tsx:5`, `trpc/client.tsx:8`). It does **not** use `createTRPCReact` from
`@trpc/react-query`, and `@trpc/react-query` is not installed.

The practical consequence, stated first-party by the package itself:

> The new `@trpc/tanstack-react-query` package does not use `utils.invalidate()`. Use
> `queryClient.invalidateQueries()` with `queryFilter()` instead.
>
> — `node_modules/@trpc/tanstack-react-query/skills/react-query-setup/SKILL.md:312-324`

So **none of these exist here**: `trpc.x.useQuery()`, `trpc.x.useMutation()`,
`trpc.useUtils()`, `utils.x.invalidate()`, `utils.x.setData()`, `trpc.Provider`,
`useContext()`. Any guidance that uses them is describing the classic package and is
actively wrong for this repo. The classic→new mapping table is at
`node_modules/@trpc/tanstack-react-query/skills/react-query-classic-migration/SKILL.md:156-161`.

**Note on the source of truth.** Both `@trpc/server` and `@trpc/tanstack-react-query`
ship their own first-party `skills/*/SKILL.md` docs inside `node_modules` (21 of them;
`find node_modules/@trpc -name SKILL.md`). They carry `library_version: '11.16.0'` in
frontmatter while the installed code is 11.18.0, so they are near-current but not
version-exact — where a SKILL.md and the installed `src/` disagree, the source wins.
Both packages also ship full uncompiled TypeScript `src/`, which is the highest-trust
source available and is what most citations below point at.

---

## 1. Query keys

### Structure

Built by one internal function, `getQueryKeyInternal`
(`node_modules/@trpc/tanstack-react-query/src/internals/utils.ts:121-178`). Its own
comment states the intent:

> To allow easy interactions with groups of related queries, such as invalidating all
> queries of a router, we use an array as the path when storing in tanstack query.
> — `utils.ts:114-120`

The shape, with **no** `keyPrefix` configured (which is this repo's case — no `keyPrefix`
is passed in `trpc/server.tsx:13-17` or `trpc/client.tsx:54`):

```ts
type TRPCQueryKeyWithoutPrefix = [
  path: string[],
  opts?: { input?: unknown; type?: 'query' | 'infinite' },
];
// types.ts:87-90
```

Concretely, for a router `products` with a procedure `list`:

| Call | Resulting key |
| --- | --- |
| `trpc.pathKey()` | `[]` |
| `trpc.products.pathKey()` | `[['products']]` |
| `trpc.products.list.pathKey()` | `[['products','list']]` |
| `trpc.products.list.queryKey()` | `[['products','list'], { type: 'query' }]` |
| `trpc.products.list.queryKey({ page: 1 })` | `[['products','list'], { input: { page: 1 }, type: 'query' }]` |
| `trpc.products.list.infiniteQueryKey({ limit: 10 })` | `[['products','list'], { input: { limit: 10 }, type: 'infinite' }]` |
| `trpc.products.create.mutationKey()` | `[['products','create']]` |

Derived from `utils.ts:127-178` and `createOptionsProxy.ts:379-482`. Note the empty-path
special case — `trpc.pathKey()` returns `[]`, not `[[]]`, deliberately "for
`utils.invalidate()` to match all queries (including vanilla react-query)"
(`utils.ts:140-142`). Dotted path segments are split (`utils.ts:135`), so
`trpc['a.b'].queryKey()` and `trpc.a.b.queryKey()` produce the same key.

`mutationKey` is `[path]` only — no input, no type (`utils.ts:183-196`). Because a
mutation key is `[['products','create']]` and `trpc.products.pathKey()` is
`[['products']]`, a `pathKey`-based filter matches mutations too — flagged in the source
at `utils.ts:138`.

**With a `keyPrefix`** the key becomes `[[prefix], path, opts]` — the prefix is
`unshift`ed onto the front (`utils.ts:174-177`, `types.ts:95-98`). This is the load-bearing
detail behind §5 below.

### The full surface on the proxy

Every **query** procedure carries (`createOptionsProxy.ts:156-213`, plus
`DecorateRouterKeyable` at `:51-72`):

- `queryOptions(input?, opts?)` — options object for `useQuery` / `useSuspenseQuery` / `prefetchQuery`
- `queryKey(input?)` — the key, typed as a `DataTag<key, output, error>`
- `queryFilter(input?, filters?)` — a `QueryFilters` with `queryKey` filled in
- `pathKey()` / `pathFilter(filters?)` — the `type`-less, input-less key/filter

Every **router node** carries only `pathKey` / `pathFilter`
(`createOptionsProxy.ts:259-291`). Query procedures whose input has an optional `cursor`
additionally get `infiniteQueryOptions` / `infiniteQueryKey` / `infiniteQueryFilter`
(`createOptionsProxy.ts:99-155`, gated by `OptionalCursorInput` at `:242-254` /
`types.ts:26-27`). Mutations get `mutationOptions` / `mutationKey` only —
**there is no `mutationFilter`** (`createOptionsProxy.ts:215-230`).

`queryFilter` / `pathFilter` / `infiniteQueryFilter` are shallow merges: they spread the
caller's filter object and overwrite `queryKey` (`createOptionsProxy.ts:386-395`,
`:420-430`, `:455-465`). So `exact`, `type`, `stale`, `predicate`, `refetchType` all pass
through untouched.

### Granularity: what a filter actually matches

`invalidateQueries` → `queryCache.findAll(filters)` → `matchQuery`
(`node_modules/@tanstack/query-core/src/utils.ts:134-179`). Without `exact: true` it uses
`partialMatchKey(query.queryKey, filterKey)` (`utils.ts:152`), whose implementation
(`utils.ts:239-269`) is:

- **arrays** — iterate only `b`'s indices (`for (let i = 0; i < b.length; i++)`), so a
  shorter filter array is a **prefix match**;
- **objects** — iterate only `b`'s own keys, so a filter object is a **subset match**,
  recursively.

Four consequences that decide the granularity question:

1. `trpc.products.pathFilter()` → key `[['products']]` matches **everything** under the
   `products` router: every procedure, every input, both `query` and `infinite`.
2. `trpc.products.list.queryFilter()` → key `[['products','list'], { type: 'query' }]`
   matches **every input** of `products.list` — but **not** its infinite variants,
   because the filter object carries `type: 'query'` and the infinite key carries
   `type: 'infinite'`. To hit both, use `trpc.products.list.pathFilter()`.
3. `trpc.products.list.queryFilter({ status: 'active' })` matches every cached
   `products.list` query whose input **contains** `status: 'active'` — including inputs
   with extra keys like `{ status: 'active', page: 3, search: 'x' }`. Partial input
   matching is the default; `exact: true` switches to a `queryHash` string comparison
   (`query-core/src/utils.ts:147-155`).
4. Since the path is an array element, prefix matching is **per path segment**, not per
   character. There is no way to say "all procedures starting with `list`".

The narrowest supported targeting is therefore: exact procedure + exact input +
`{ exact: true }`. The broadest is `trpc.pathKey()` → `[]`, which matches every query in
the cache.

For arbitrary logic beyond prefix/subset matching, `QueryFilters` accepts a `predicate`
(`query-core/src/utils.ts:175-177`), and `readQueryKey`
(`@trpc/tanstack-react-query/src/internals/utils.ts:38-54`) is **exported** to destructure
a key inside one — it returns `{ type, prefix, path, args }` and handles both prefixed and
unprefixed shapes.

### Typed cache reads/writes come free

`queryKey()` returns a `DataTag<TRPCQueryKey, TOutput, TRPCClientErrorLike<...>>`
(`createOptionsProxy.ts:173-180`), and `infiniteQueryKey()` returns a `DataTag` carrying
`InfiniteData<TOutput, cursor>` (`:115-122`). `QueryClient.getQueryData` /
`setQueryData` read the tag to infer the data type
(`query-core/src/queryClient.ts:130-138`, via `InferDataFromTag`). So
`queryClient.setQueryData(trpc.products.byId.queryKey({ id }), updater)` is fully typed
with zero extra annotation — the type argument for optimistic writes is already carried by
the key.

---

## 2. Invalidation after a mutation

### The idiomatic shape, first-party

```tsx
const trpc = useTRPC();
const queryClient = useQueryClient();

const createUser = useMutation(
  trpc.user.create.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries(trpc.user.queryFilter());
    },
  }),
);
```

— `@trpc/tanstack-react-query/skills/react-query-setup/SKILL.md:150-169`, verbatim.

`mutationOptions(opts)` returns a plain `UseMutationOptions` with `mutationKey`,
`mutationFn` and `trpc` filled in and everything else spread through
(`mutationOptions.ts:131-146`). `mutationKey` and `mutationFn` are the only reserved keys
(`mutationOptions.ts:27`), so `onMutate`, `onSuccess`, `onError`, `onSettled`, `retry`,
`meta` are all yours. The object is inert — it is not a hook, so it can be built in a
module-level helper, wrapped, or composed freely.

The documented invalidation vocabulary (same SKILL.md, `:174-201`):

```tsx
queryClient.invalidateQueries(trpc.user.byId.queryFilter({ id: '1' })); // one query
queryClient.invalidateQueries(trpc.user.queryFilter());                 // one router
queryClient.invalidateQueries({ queryKey: trpc.pathKey() });            // all tRPC queries
```

### Invalidating a list from a detail mutation

There is no special mechanism. Because the proxy is a plain object reachable from
anywhere a `useTRPC()` (client) or the server `trpc` export (server) is in scope, a
mutation on `products.update` invalidates the list by naming it:

```tsx
onSuccess: () => {
  queryClient.invalidateQueries(trpc.products.list.queryFilter());
  queryClient.invalidateQueries(trpc.products.byId.queryFilter({ id }));
}
```

or, more bluntly, `trpc.products.pathFilter()` for the whole router. The only tRPC-side
help is that keys share a path prefix, so a router-level filter is one call
(§1). **There is no key→key dependency graph and no automatic cascade.** Who names what
is entirely a convention this repo has to invent — which is exactly what #9 must settle.

### The behaviour of `invalidateQueries` that matters

```ts
invalidateQueries(filters?, options = {}) {
  return notifyManager.batch(() => {
    this.#queryCache.findAll(filters).forEach((query) => query.invalidate())
    if (filters?.refetchType === 'none') return Promise.resolve()
    return this.refetchQueries(
      { ...filters, type: filters?.refetchType ?? filters?.type ?? 'active' },
      options,
    )
  })
}
```
— `query-core/src/queryClient.ts:298-318`.

Facts falling out of that:

- It does **two** things: marks every match stale, then refetches. The refetch set defaults
  to `type: 'active'` — **only mounted observers refetch**. Inactive cached queries are
  merely marked stale and refetch on next mount. A blunt `trpc.pathKey()` invalidation is
  therefore much cheaper than it looks: it stales the world but refetches only what's on
  screen.
- `refetchType: 'none'` stales without any refetch; `refetchType: 'all'` forces inactive
  ones too.
- It returns a `Promise<void>`. Awaiting it inside `onSuccess` keeps the mutation in
  `isPending` until the refetch settles — the standard lever for "keep the spinner until
  the list is actually fresh".
- `matchMutation` also exists (`query-core/src/utils.ts:182-209`) and does the same partial
  matching for `mutationKey`, which is what `useMutationState`/`useIsMutating` filter on —
  but as noted, the proxy exposes no `mutationFilter` helper, so you pass
  `{ mutationKey: trpc.products.create.mutationKey() }` by hand.

### One global override hook

`createTRPCOptionsProxy` accepts `overrides.mutations.onSuccess`
(`createOptionsProxy.ts:296-299`, `mutationOptions.ts:77-89`, wired at `:120-144`):

```ts
overrides?: { mutations?: MutationOptionsOverride }

interface MutationOptionsOverride {
  onSuccess: (opts: {
    originalFn: () => MaybePromise<void>;  // the per-call onSuccess
    queryClient: QueryClient;
    meta: Record<string, unknown>;         // from useMutation's meta
  }) => MaybePromise<void>;
}
```

This is the supported seam for an app-wide "after every mutation, do X" rule — e.g.
reading an invalidation target out of `meta` — without every call site repeating it. The
repo does **not** configure it today (`trpc/server.tsx:13-17`, `trpc/client.tsx:54`).
Caveat: it exists only on `onSuccess`; there is no `onError`/`onSettled` override.

---

## 3. Optimistic updates

The options proxy adds **nothing** for optimistic updates. It ships no equivalent of the
classic `utils.x.setData` / `utils.x.cancel` / `utils.x.getData` helpers. What you get is
the typed key (§1) plus plain TanStack Query v5 mechanics.

TanStack documents two approaches
([guides/optimistic-updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)):

**A. Via the UI (variables).** Read `variables` off the mutation result and render a
pending row while `isPending`; `onSettled: () => queryClient.invalidateQueries(...)`
reconciles. No cache writes, no rollback code. The documented limit: it works when "the
mutation and the query live in the same component" — otherwise `useMutationState`
(exported from `@tanstack/react-query`, `react-query/src/index.ts:52`) is needed to read
the in-flight variables from elsewhere.

**B. Via the cache (`onMutate` + rollback).**

```tsx
onMutate: async (newTodo, context) => {
  await context.client.cancelQueries({ queryKey: ['todos'] })
  const previousTodos = context.client.getQueryData(['todos'])
  context.client.setQueryData(['todos'], (old) => [...old, newTodo])
  return { previousTodos }
}
```

`cancelQueries` is mandatory — without it an in-flight refetch lands after the optimistic
write and clobbers it. The returned snapshot is the rollback value for `onError`, and
`onSettled` invalidates.

### What B specifically costs under the options proxy

Per mutation, per affected query shape, you hand-write:

1. `queryClient.cancelQueries(trpc.products.list.pathFilter())` — note `pathFilter`, since
   a partial filter is how you reach every cached page/filter combination at once.
2. A snapshot. For an admin list keyed by `{ page, perPage, search, sortBy, sortOrder,
   status, ... }` (the input shape #10 is designing), **every cached input combination is a
   separate cache entry**. A snapshot of one key does not cover the others; a correct
   rollback either snapshots `queryClient.getQueriesData(filter)` (plural) or accepts that
   only the currently-visible key is restored.
3. An updater that reproduces server-side ordering, filtering and pagination in the
   browser. Inserting a new product into a `sortBy=createdAt&status=active&page=1` page
   means re-deciding whether it belongs on that page at all. tRPC gives no help here.
4. For infinite lists the cached value is `InfiniteData<TOutput, cursor>`
   (`@trpc/tanstack-react-query/src/internals/types.ts:39-42`), so the updater walks
   `data.pages` — a different updater from the paginated one.

Types are the one thing that is free: the `DataTag` on `queryKey()` (§1) makes
`getQueryData` / `setQueryData` type-correct with no annotations.

**Fact relevant to #9's "argue the no case":** approach A requires no cache writes, no
snapshot, no rollback, and no per-input-shape reasoning — it costs one `isPending` branch
in the rendering component plus the `onSettled` invalidation that a non-optimistic
mutation needs anyway. The expensive option is B, and its cost scales with the number of
distinct cached inputs, which for a filterable admin list is unbounded.

---

## 4. `prefetch` + `HydrateClient` + `useSuspenseQuery`

### The triangle is current and is copied verbatim from the docs

The tRPC v11 server-components guide publishes exactly the code in `trpc/server.tsx`,
character for character:

```typescript
export function HydrateClient(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {props.children}
    </HydrationBoundary>
  );
}

export function prefetch<T extends ReturnType<TRPCQueryOptions<any>>>(
  queryOptions: T,
) {
  const queryClient = getQueryClient();
  if (queryOptions.queryKey[1]?.type === 'infinite') {
    void queryClient.prefetchInfiniteQuery(queryOptions as any);
  } else {
    void queryClient.prefetchQuery(queryOptions);
  }
}
```
— <https://trpc.io/docs/client/tanstack-react-query/server-components>

`getQueryClient = cache(makeQueryClient)` and the `shouldDehydrateQuery` extension in
`trpc/query-client.ts:14-17` are likewise the documented setup. `useSuspenseQuery` is
exported and current (`@tanstack/react-query/src/index.ts:11`), as are
`useSuspenseInfiniteQuery` and `useSuspenseQueries`. The `queryOptions` object the proxy
returns is a real TanStack `queryOptions(...)` result
(`queryOptions.ts:257-264`), so it is accepted by `useQuery`, `useSuspenseQuery`,
`prefetchQuery`, `ensureQueryData` and `queryClient.query` interchangeably.

**Verdict: the triangle is current for 11.18.0 / 5.102.8 — with one deprecation caveat, next.**

### ⚠ `prefetchQuery` and `prefetchInfiniteQuery` are deprecated in the installed version

This is the sharpest finding in this document, and the docs above have not caught up.

```ts
/**
 * @deprecated Use queryClient.query(options) instead. You can swallow errors with
 * `.catch(noop)`. This method will be removed in the next major version.
 */
prefetchQuery<...>(options): Promise<void>
```
— `query-core/src/queryClient.ts:422-435`

The full deprecation set in 5.102.8 (`grep -n "@deprecated" query-core/src/queryClient.ts`):

| Deprecated | Replacement | Line |
| --- | --- | --- |
| `ensureQueryData` | `queryClient.query({ ...options, staleTime: 'static' })` | `:140-142` |
| `fetchQuery` | `queryClient.query(options)` | `:388-390` |
| `prefetchQuery` | `queryClient.query(options)` + `.catch(noop)` | `:422-424` |
| `fetchInfiniteQuery` | `queryClient.infiniteQuery(options)` | `:459-461` |
| `prefetchInfiniteQuery` | `queryClient.infiniteQuery(options)` + `.catch(noop)` | `:481-483` |
| `ensureInfiniteQueryData` | `queryClient.infiniteQuery({ ...options, staleTime: 'static' })` | `:502-504` |

The option **types** are deprecated too: `FetchQueryOptions`, `EnsureQueryDataOptions`,
`FetchInfiniteQueryOptions`, `EnsureInfiniteQueryDataOptions` all carry bare
`/** @deprecated */` (`query-core/src/types.ts:512`, `:531`, `:548`, `:592`).

`query()` and `infiniteQuery()` are the new names (`queryClient.ts:346-386` and
`:437-457`); `infiniteQuery()` is literally `options._type = 'infinite'; return
this.query(options)`. TanStack's own current advanced-SSR guide already uses the new form:

```tsx
await queryClient.query({ queryKey: ['posts'], queryFn: getPosts }).catch(noop)
```
— <https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr>

So `trpc/server.tsx`'s `prefetch` helper calls two methods slated for removal in v6.
`AGENTS.md` says "Heed deprecation notices." The rewrite is mechanical and does not change
the triangle:

```ts
if (queryOptions.queryKey[1]?.type === "infinite") {
  void queryClient.infiniteQuery(queryOptions as any).catch(() => {});
} else {
  void queryClient.query(queryOptions).catch(() => {});
}
```

One behavioural difference to be aware of: `query()` returns the data and applies `select`
(`queryClient.ts:346-385`); `prefetchQuery` swallowed errors internally. With `query()` the
`.catch` is the caller's job, which is why the docs spell it out.

### Over-hydration: the mechanism, and what the docs actually say

`trpc/server.tsx`'s comment is mechanically correct. `dehydrate` takes **no key filter**:

```ts
const queries = client
  .getQueryCache()
  .getAll()
  .flatMap((query) => filterQuery(query) ? [dehydrateQuery(...)] : [])
```
— `query-core/src/hydration.ts:182-189`

`getAll()` — the entire cache. The only lever is the `shouldDehydrateQuery` predicate
(`hydration.ts:170-173`), whose default is `query.state.status === 'success'`
(`:150-152`). Since `getQueryClient` is `cache()`d per request (`trpc/server.tsx:11`),
every `prefetch` anywhere in the request tree lands in the one cache, and every
`<HydrateClient>` serialises all of it.

The repo **widens** this on purpose:

```ts
shouldDehydrateQuery: (query) =>
  defaultShouldDehydrateQuery(query) || query.state.status === "pending",
```
— `trpc/query-client.ts:14-17`

That is the documented streaming pattern — it is what lets `prefetch` not be awaited, by
dehydrating the in-flight promise itself (`hydration.ts:138-140`, `dehydratePromise` at
`:92-114`). It also means an un-awaited, unread prefetch still ships a streamed promise.

Documented guidance on the problem, verbatim in substance from TanStack's advanced-SSR
guide: when a single shared QueryClient is used across Server Components, every
`dehydrate()` call serialises *the entire* queryClient including previously-serialised
queries, and the recommended fix is **a new QueryClient per Server Component**. That
recommendation is in direct tension with tRPC's `cache()`d-singleton setup, which exists so
that `prefetch` and `HydrateClient` can be called from different components in the same
request.

The three levers that exist, then:

1. **Narrow `shouldDehydrateQuery`** — a predicate can inspect `query.queryKey`, and
   `readQueryKey` (`@trpc/tanstack-react-query/src/internals/utils.ts:38`) destructures it.
2. **A non-cached query client per boundary** — TanStack's recommendation; costs the
   convenience of the `prefetch`/`HydrateClient` split.
3. **Keep server-only data out of the cache entirely** — the `caller` (§6). This is what
   `trpc/server.tsx:20-25` already chose, and tRPC's own docs endorse it: the caller "is
   detached from your query client and does not store the data in the cache."

Also relevant to #8's boundary question: `HydrationBoundary` is a client component
(`react-query/src/HydrationBoundary.tsx:1`) that hydrates **during the render phase**, and
must be present "in each route where you prefetch — there's no way to eliminate this
boilerplate with Server Components" (advanced-SSR guide). It holds back hydration of
queries already in the cache until after render, to keep aborted transitions from
clobbering current data (`HydrationBoundary.tsx:38-52`).

---

## 5. Infinite queries: is `queryKey[1]?.type === "infinite"` still the way?

**Yes for this repo as configured — but it is a positional read that silently breaks under
one specific change, and TanStack now carries the same information in a first-class field.**

### It is current

The branch is what tRPC v11 documents today (quoted verbatim in §4) and it is correct
against the installed key builder: `infiniteQueryOptions` builds its key with
`type: 'infinite'` (`createOptionsProxy.ts:432-446` → `utils.ts:145-171`), and
`queryOptions` with `type: 'query'` (`:397-411`).

### The failure mode

`queryKey[1]` is the *options* slot only when there is no key prefix. With a `keyPrefix`
the key is `[[prefix], path, opts]` (`utils.ts:174-177`, `types.ts:95-98`), so `queryKey[1]`
becomes the **path array** — `.type` is `undefined`, the branch silently falls to the
`query` side, and infinite prefetches break with no type error (the helper is already
`any`-cast). The package's own guard for this is `isPrefixedQueryKey` /`readQueryKey`
(`utils.ts:32-54`), which checks `queryKey.length >= 3`. A prefix-safe form:

```ts
import { readQueryKey } from "@trpc/tanstack-react-query"; // exported via `export type * from './internals/types'`? — see note
readQueryKey(queryOptions.queryKey).args?.type === "infinite"
```

(`readQueryKey` is exported from `internals/utils.ts` but `src/index.ts:1-26` does **not**
re-export it, so it is not reachable from the package root today. The prefix-safe check
therefore has to be written inline: `queryKey.length >= 3 ? queryKey[2]?.type :
queryKey[1]?.type`.)

This repo passes no `keyPrefix` (`trpc/server.tsx:13-17`, `trpc/client.tsx:54`), so the
branch is correct **today**. It is a latent trap, not a live bug.

### TanStack now models this directly

In 5.102.8 a `Query` carries its own `queryType`:

```ts
#queryType?: 'infinite'
get queryType() { return this.#queryType }
setOptions(options) { if (options?._type) { this.#queryType = options._type } }
```
— `query-core/src/query.ts:164`, `:194-195`, `:207-209`

`queryClient.infiniteQuery` / `fetchInfiniteQuery` / `ensureInfiniteQueryData` set
`options._type = 'infinite'` (`queryClient.ts:456`, `:479`, `:518`), the query then selects
`infiniteQueryBehavior` from it (`query.ts:513-517`), and dehydration round-trips it
(`hydration.ts:66`, `:142`, `:283`). So the *runtime* no longer infers infinite-ness from
the key. But `_type` is set **by the fetch method you call**, not present on the options
object the tRPC proxy hands you — so the dispatch in `prefetch` still has to come from
somewhere, and the key is the only signal available. The tRPC key branch remains the
mechanism; TanStack's `_type`/`queryType` is downstream of it.

### Other infinite facts

- `infiniteQueryOptions` is only generated for procedures whose input is
  `{ cursor?: any } | void` (`types.ts:26-27`, gated at `createOptionsProxy.ts:242-254`).
  A `page`/`perPage` offset list — which is what #10 describes — gets **no**
  `infiniteQueryOptions`, `infiniteQueryKey` or `infiniteQueryFilter` at all. Offset
  pagination under this API is ordinary `queryOptions` with the page in the input, one
  cache entry per page.
- `cursor` and `direction` are **stripped from the key** and re-injected per page at fetch
  time (`utils.ts:145-162`, `:69-78`), so all pages of one infinite query share one key —
  which is what makes `infiniteQueryFilter(input)` able to target the whole list.
- `initialPageParam` defaults to `opts.initialCursor ?? input.cursor`
  (`infiniteQueryOptions.ts:294`); `getNextPageParam` is required by the caller.

---

## 6. `createCaller` alongside the options proxy

### Current guidance: supported, and the recommended escape hatch from over-hydration

tRPC's own server-components guide publishes `export const caller =
appRouter.createCaller(createTRPCContext);` next to the options proxy, describing it as the
way to get "direct data access within server components, operating outside the query
cache", and states plainly that "this method is detached from your query client and does
not store the data in the cache. This means that you cannot use the data in a server
component and expect it to be available in the client."
(<https://trpc.io/docs/client/tanstack-react-query/server-components>)

`trpc/server.tsx:20-25` matches that guidance exactly, and its stated rationale (avoiding
over-hydration) is the documented reason the pattern exists.

### The signature, and why `React.cache` is in the type's own docstring

```ts
export type RouterCaller<TRoot, TRecord> = (
  /**
   * @note
   * If passing a function, we recommend it's a cached function
   * e.g. wrapped in `React.cache` to avoid unnecessary computations
   */
  ctx: TRoot['ctx'] | (() => MaybePromise<TRoot['ctx']>),
  options?: { onError?: RouterCallerErrorHandler<TRoot['ctx']>; signal?: AbortSignal },
) => DecorateRouterRecord<TRecord>;
```
— `@trpc/server/src/unstable-core-do-not-import/router.ts:61-75`

The repo passes `createTRPCContext`, which **is** `cache(async () => ({}))`
(`trpc/init.ts:5-10`). Correct per that note.

### Is request-level deduplication the caller's problem or the framework's? — **the caller's.**

`createCallerFactory` (`router.ts:441-496`) builds a recursive proxy where **every** call
resolves the context, resolves the procedure and invokes it:

```ts
ctx = isFunction(ctxOrCallback) ? await Promise.resolve(ctxOrCallback()) : ctxOrCallback;
return await procedure({ path: fullPath, getRawInput: async () => args[0], ctx, ... });
```
— `router.ts:470-481`

There is no cache, no memo, no in-flight map. `React.cache` on the **context** dedupes only
the context construction. Two `caller.products.byId({ id })` calls in one request run the
procedure — middleware, validation, DB query — twice.

Nothing in the framework fills this gap either. Next 16.3.4's own guidance is explicit that
`React.cache` is the mechanism and that it is something you apply yourself:

> Wrap a data-fetching function in `React.cache` so multiple components in the same request
> share one result instead of refetching.
> — `node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md:546-548`
>
> `React.cache` is scoped to the current request only. Each request gets its own
> memoization scope with no sharing between requests. — same file, `:590`

Next's `fetch` deduplication does not apply: the caller never goes through `fetch`, it calls
the procedure in-process.

**Two caveats for whoever designs `lib/request-cache.ts` (#8):** React's `cache` compares
arguments with `Object.is` shallow equality, so a cached function taking an object
(`getProduct({ id })`) **misses on every call** — each call site builds a fresh literal.
Only primitive arguments, or a shared reference, hit. And `cache()` also caches thrown
errors, re-throwing the same error for the same arguments
(<https://react.dev/reference/react/cache>).

### Documented anti-pattern

> Calling `createCaller` from within a procedure re-creates context, re-runs all middleware,
> and re-validates input; extract shared logic into a plain function instead.
> — `@trpc/server/skills/server-side-calls/SKILL.md:183-216` (severity `[HIGH]`)

`createCaller` also accepts `{ onError }` and `{ signal }` (`router.ts:71-74`,
threaded at `:479` and `:483-489`) — the repo passes neither.

---

## 7. Error shape on the client

### What a `TRPCError` becomes

Client-side it is a `TRPCClientError`, an `Error` subclass with three extra readable
members (`@trpc/client/src/TRPCClientError.ts:47-85`):

| Member | Type | Contents |
| --- | --- | --- |
| `message` | `string` | the `TRPCError` message, or `'Unknown error'` |
| `shape` | `TShape \| null \| undefined` | the whole formatted error shape |
| `data` | `TShape['data'] \| null \| undefined` | the `data` sub-object |
| `cause` | `Error \| undefined` | transport-level cause |
| `meta` | `Record<string, unknown> \| undefined` | "in the case of HTTP-errors, we'll have `response` and potentially `responseJSON` here" (`:57-61`) |

The default `data` payload (`@trpc/server/src/unstable-core-do-not-import/error/formatter.ts:26-36`):

```ts
export type DefaultErrorData = {
  code: TRPC_ERROR_CODE_KEY;   // 'UNAUTHORIZED' | 'NOT_FOUND' | ...
  httpStatus: number;
  path?: string;               // procedure that threw
  stack?: string;              // development only
};
```

So the machine-readable discriminator for pt-BR copy is **`error.data.code`** — a stable
English enum string — not `error.message`, which is free text. `shape.code` is the numeric
JSON-RPC code, not the string. `shape` and `data` are `Maybe<...>` (i.e. can be `null`)
because a network-level failure produces a `TRPCClientError` with no server shape at all
(`TRPCClientError.ts:110-116`) — pt-BR copy needs a fallback for that case.

`isTRPCClientError(cause)` is exported for narrowing (`TRPCClientError.ts:22-26`).

The typed error surfaced on `useQuery`/`useMutation` is `TRPCClientErrorLike<{transformer,
errorShape}>` — wired into every `queryOptions`/`mutationOptions` return
(`createOptionsProxy.ts:176-179`, `mutationOptions.ts:60`) and into the `DataTag` on
`queryKey` — so `error.data.code` is typed at the call site with no casting.

### The supported hook for shaping errors: `errorFormatter`

One hook, configured once on `initTRPC.create`
(`@trpc/server/src/unstable-core-do-not-import/error/formatter.ts:8-20`):

```ts
type ErrorFormatter<TContext, TShape> = (opts: {
  error: TRPCError;
  type: ProcedureType | 'unknown';
  path: string | undefined;
  input: unknown;
  ctx: TContext | undefined;
  shape: DefaultErrorShape;
}) => TShape;
```

Whatever it returns becomes `error.shape` / `error.data` on the client, **fully typed
end to end** — the return type flows through the router's `$types['errorShape']` into
`TRPCClientErrorLike`. This is the supported place to add anything a pt-BR mapper needs:
a flattened Zod error, a stable app-level code, a field map for React Hook Form.

The canonical Zod recipe, first-party
(`@trpc/server/skills/error-handling/SKILL.md:28-45`):

```ts
const t = initTRPC.create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.code === 'BAD_REQUEST' && error.cause instanceof ZodError
            ? error.cause.flatten()
            : null,
      },
    };
  },
});
```

with the stated consequence of omitting it: "Without a custom errorFormatter, the client
receives a generic message without field-level validation details from Zod."
(same file, `:198-233`, severity `[HIGH]`).

**`trpc/init.ts:12-17` configures no `errorFormatter`.** Today the client therefore sees
only `{ code, httpStatus, path, stack? }` — there is no field-level validation detail
reaching a form, and #9's "field-level validation errors get back into a React Hook Form"
requirement is currently unimplementable without adding one. Also note the repo is on
**Zod 4.5.4**, where `.flatten()` is deprecated in favour of `z.treeifyError()` /
`error.issues` — the SKILL.md recipe is written for Zod 3 and needs adapting.

Full code table (`error-handling/SKILL.md:235-247`): `BAD_REQUEST` 400, `UNAUTHORIZED` 401,
`FORBIDDEN` 403, `NOT_FOUND` 404, `CONFLICT` 409, `UNPROCESSABLE_CONTENT` 422,
`TOO_MANY_REQUESTS` 429, `INTERNAL_SERVER_ERROR` 500.

Two more facts for #9:

- A plain `throw new Error(...)` in a procedure is wrapped as `INTERNAL_SERVER_ERROR` (500)
  and its message is **not** forwarded to the client
  (`error-handling/SKILL.md:140-170`, `[HIGH]`). Only `TRPCError` carries a usable code.
- `stack` is included only when `isDev` is true, defaulting to `NODE_ENV !== 'production'`;
  the docs advise setting `isDev` explicitly "for deterministic behavior across runtimes"
  (`error-handling/SKILL.md:172-196`). The repo does not set it.

---

## 8. superjson: what it constrains

Wired on both sides as required: `initTRPC.create({ transformer: superjson })`
(`trpc/init.ts:12-17`) and on the terminating link
(`trpc/client.tsx:57-60`). Both are mandatory and must match; a mismatch on either side, or
on any one branch of a `splitLink`, is documented as `[CRITICAL]`
(`@trpc/client/skills/superjson/SKILL.md:151-267`). In v11 `transformer` lives on the
**link**, not on `createTRPCClient` — passing it to the constructor throws a `TypeError`
(same file, `:186-203`).

The query client is separately configured with `serializeData: superjson.serialize` /
`deserializeData: superjson.deserialize` for the hydration boundary
(`trpc/query-client.ts:12-19`), which is what carries these types through dehydration too.

### What survives the wire (verified empirically against superjson 2.2.6)

Registered transformers, from `node_modules/superjson/dist/transformer.js:1-106`:
`undefined`, `bigint`, `Date`, `Error`, `RegExp`, `NaN` / `Infinity` / `-Infinity`, `URL`,
`symbol` (only if registered), `Map`, `Set`, typed arrays, and class instances **only via
`superjson.registerClass`** (`class-registry.js`).

Round-tripped through actual JSON text (serialize → `JSON.stringify` → `JSON.parse` →
deserialize) on the installed version:

```
wire: {"json":{"money":{"cents":1999},"d":"2026-01-01T00:00:00.000Z"},
       "meta":{"values":{"d":["Date"]},"v":1}}
date is Date  : true
money is Money: false
money proto   : Object.prototype (class lost)
money.format? : undefined
```

**Constraint 1 — dates cross the wire, and they cross as real `Date` objects.** A procedure
may return `Date` freely; the client receives `instanceof Date`, and TypeScript agrees,
because `inferTransformedProcedureOutput` (used at `createOptionsProxy.ts:273`) preserves
the un-serialised type when a transformer is configured. Without superjson the type would
degrade to `string`. Formatting `Date` → pt-BR is therefore a pure client concern.

**Constraint 2 — an unregistered class instance is silently flattened to a plain object.**
Methods vanish, `instanceof` fails, and **the TypeScript type still claims it is the class**.
This is a silent runtime failure with no compile-time signal. So a procedure must not return
a domain object with behaviour (a `Money` class, a Drizzle model wrapper, a Zod-branded
class) unless it is registered. Returning plain data — `{ priceInCents: number }` — has no
such hazard. The same applies to Drizzle row objects only insofar as they are plain objects,
which they are.

**Constraint 3 — integer cents are fine as `number`; `bigint` is not, in query inputs.**
superjson transports `bigint` correctly over the wire. But **query keys are hashed by
`JSON.stringify`**, not by superjson:

```ts
export function hashKey(queryKey) {
  return JSON.stringify(queryKey, (_, val) =>
    isPlainObject(val) ? Object.keys(val).sort().reduce(...) : val)
}
```
— `query-core/src/utils.ts:223-234`; used for `exact: true` matching (`utils.ts:149`) and for
every query's `queryHash`. tRPC's `queryOptions` reserves `queryHashFn`/`queryHash`
(`queryOptions.ts:32`) and sets neither, so the default `hashKey` always applies.

Verified against that exact function, for values appearing in a procedure **input**:

| Input value | Hashed as | Consequence |
| --- | --- | --- |
| `new Date('2026-01-01')` | `"2026-01-01T00:00:00.000Z"` | fine, stable |
| `new Map([['a',1]])` | `{}` | **all Maps collide into one cache entry** |
| `new Set([1,2])` | `{}` | **all Sets collide** |
| `{ a: undefined, b: 1 }` | `{"b":1}` | `undefined` keys drop; `{a:undefined,b:1}` and `{b:1}` are the same query |
| `10n` (bigint) | — | **throws `TypeError: JSON.stringify cannot serialize BigInt`** |

So: money as **integer cents in a `number`** is safe everywhere. Money as `bigint` would
transport fine but **throws at cache-key time** the moment it appears in a query input.
Dates in a filter input (the `createdAt` range #10 describes) are safe. `Map`/`Set` must
never appear in a query input. `undefined`-valued keys being dropped means
`{ search: undefined, page: 1 }` and `{ page: 1 }` share one cache entry — relevant to #10's
deliberate `search || undefined` behaviour, and actually helpful there.

**Constraint 4 — nothing here constrains an *output* to be JSON-serialisable.** The
hashing constraint applies to inputs only. Outputs go through superjson in both the HTTP
response and the dehydration boundary.

---

## 9. Repo discrepancies found while researching

Not findings about the libraries, but facts about the repo that the tickets assume
otherwise. Flagged because they change what #8/#9/#10 can rely on.

1. **`data-flow.tsx` does not exist.** Issues #8, #9 and #10 all cite it as the prior art
   being decided on ("`data-flow.tsx` at the repo root shows the pattern"). It is not in the
   worktree, not in the shared checkout, not on any branch, and not gitignored —
   `find . -name "*data-flow*"` outside `node_modules` returns nothing, and the repo root
   holds only `drizzle.config.ts`, `next.config.ts`, `next-env.d.ts`, `proxy.ts`. Its
   contents could not be verified, so every claim in this document about "the triangle" is
   grounded in `trpc/server.tsx` and the tRPC docs instead. The functions those tickets
   attribute to it (`normalizeProductsParams`, the two-path read pattern) exist nowhere in
   the repo.
2. **`lib/request-cache.ts` does not exist** — already noted in #8, confirmed here.
   `trpc/server.tsx:23-24` points at it. `lib/` holds `auth.ts`, `auth-client.ts`,
   `auth-utils.ts`, `constants.ts`, `env.ts`, `s3.ts` and `utils/`.
3. **`trpc/server.tsx`'s `prefetch` uses two deprecated methods** (§4). Removal is
   scheduled for the next major.
4. **No `errorFormatter`** (§7) — field-level validation detail does not currently reach
   the client.
5. **`TRPCQueryOptions` is imported as a value** in `trpc/server.tsx:3-4` but is a
   **type-only export** (`@trpc/tanstack-react-query/src/index.ts:12`). It compiles today
   because `verbatimModuleSyntax` is off, but it should be `import type`.
6. **`overrides.mutations.onSuccess` is unused** (§2) — a supported app-wide mutation seam
   that is currently on the table for #9.

---

## Sources

**Tier 1 — installed package source and types** (all paths relative to `node_modules/`):

- `@trpc/tanstack-react-query@11.18.0/src/internals/{createOptionsProxy,utils,types,queryOptions,infiniteQueryOptions,mutationOptions,Context}.ts(x)`, `src/index.ts`
- `@trpc/tanstack-react-query@11.18.0/skills/{react-query-setup,react-query-classic-migration}/SKILL.md`
- `@trpc/server@11.18.0/src/unstable-core-do-not-import/{router.ts,error/formatter.ts}`
- `@trpc/server@11.18.0/skills/{error-handling,server-side-calls}/SKILL.md`
- `@trpc/client@11.18.0/src/TRPCClientError.ts`; `@trpc/client@11.18.0/skills/superjson/SKILL.md`
- `@tanstack/query-core` (via `@tanstack/react-query@5.102.8`) `src/{queryClient,query,utils,hydration,types}.ts`
- `@tanstack/react-query@5.102.8/src/{index.ts,HydrationBoundary.tsx}`
- `superjson@2.2.6/dist/transformer.js`, `dist/class-registry.js`
- `next@16.3.4/dist/docs/01-app/01-getting-started/06-fetching-data.md`
- Empirical round-trips against the installed `superjson@2.2.6` and a faithful reimplementation of `hashKey` from `query-core/src/utils.ts:223-234`, run under Bun 1.4.0.

**Tier 2 — official docs**

- <https://trpc.io/docs/client/tanstack-react-query/server-components>
- <https://trpc.io/docs/client/tanstack-react-query/usage>
- <https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates>
- <https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr>
- <https://react.dev/reference/react/cache>

**Repo files read for context:** `trpc/server.tsx`, `trpc/client.tsx`, `trpc/init.ts`,
`trpc/query-client.ts`, `package.json`, `docs/STACK.md`, `AGENTS.md`.
