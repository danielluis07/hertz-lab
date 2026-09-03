# 14. One lenient schema parses URL search params into list input

Date: 2026-09-02

## Status

Accepted

## Context

Every admin list is filtered, sorted and paginated from the URL. That URL has
two consumers: the server component prefetching the query, and the procedure
receiving the input. ADR-0011 already fixed that the page normalises **once**
and passes the object down as a prop, so client and server cannot derive
divergent query keys — but it left open what does the normalising.

The pattern carried over from a previous project was a hand-written function of
`??` and `||` chains:

```ts
page: params.page ?? PAGINATION.DEFAULT_PAGE,
search: params.search || undefined,
```

Its intent is right, and survives: **one named artifact owns the conversion, it
fills every default, and its output type is the procedure's input type.** Its
body does not, and the reason is in its signature. It takes
`Partial<ProductsInput>` — values that are *already typed*. But `searchParams`
is `Record<string, string | string[] | undefined>`: every value is a string,
`?status=active&status=draft` arrives as an array, and `?page=abc` arrives as
`"abc"`. The function was doing absence-handling on data whose actual problem
was that none of it had been parsed. Nothing upstream had parsed it either.

The mixed `??`/`||` was described as a deliberate distinction: `page ?? DEFAULT`
keeps a `0`, `search || undefined` discards an empty string. Only half of that
holds. Empty-string-means-absent is a real rule, and this ADR keeps it. But
`page` is 1-based everywhere in this repo — `buildPageRange` clamps
`Math.max(page, 1)`, `buildPageHref` deletes the parameter entirely at
`page <= 1` — so **`page: 0` is not a value the system has a meaning for**. The
`??` was protecting a zero that cannot legitimately arrive.

A module needs a Zod schema for the procedure's `.input()` regardless. Writing a
normalizer as well means writing the same field list twice, and the two drift
the first time a filter is added to one of them.

So the question is not whether to use Zod. It is whether the URL parser and the
procedure input are the *same* schema, and they pull in different directions:

- A **URL parser must be lenient.** An Admin can hand-edit the address bar.
  `?page=abc` must produce a list, not a crash.
- A **procedure input is conventionally strict.** A malformed input is a bug or
  an attack and should be `BAD_REQUEST`.

Two alternatives keep the strictness. **Two schemas** — a strict input schema
plus a lenient URL wrapper derived from it. **One strict schema** with the
coercion and defaulting in a separate step before it.

## Decision

**One schema, lenient per field, used as both the URL parser and the
procedure's `.input()`.**

```ts
// modules/products/admin/schemas.ts
export const productListParamsSchema = z.object({
  page: z.coerce.number().int().positive().catch(1),
  search: z.string().trim().min(1).optional().catch(undefined),
  status: z.enum(["draft", "active", "archived"]).optional().catch(undefined),
  // ...
});

export type ProductListInput = z.infer<typeof productListParamsSchema>;
```

`.catch()` is **per field, never on the object.** An object-level catch discards
every filter because one of them was malformed.

The schema is idempotent, which is what lets one object serve both sides:
`z.coerce.number()` on a `number` is a no-op, and `.catch()` on a valid value
passes it through. The page parses a record of strings; the procedure
re-validates the already-parsed object it receives over the wire.

The strictness argument does not earn its keep here. This is a **read of a
filtered list with no destructive effect**, and the right answer to a nonsense
filter is the default list, not a 500 an Admin can trigger with a typo. Both
alternatives buy strictness by paying in two artifacts that must agree — which
is the divergence ADR-0011 wrote the pass-the-input-as-a-prop rule to eliminate,
reintroduced one layer down.

## Consequences

**A programmatic caller passing garbage gets defaults, silently, rather than an
error.** This is the cost, stated plainly. It is acceptable for a list read and
would not be for a write: mutations keep strict inputs and real `TRPCError`
codes, which is the same read/write asymmetry `docs/DATA-FLOW.md` records for
absence — reads resolve to "absent", writes resolve to "refused".

**`parse` cannot throw**, since every field catches. The page calls it without a
`try`, on a URL an Admin can hand-edit.

**Unknown keys are stripped**, because Zod objects strip by default. `?foo=bar`
cannot leak into the input or perturb the query key.

**Array values fall to their default for free.** `?status=a&status=b` arrives as
an array, fails the enum, and lands on the catch. No `preprocess` is needed, and
no list surface has to think about parameter multiplicity.

**The schema's keys are the parameter names** — see `docs/DATA-FLOW.md`. In
admin the URL key and the input field are the same string, so there is no names
table and no mapping; the schema is the single declaration.
