# 13. Error copy is layered, and global by default

Date: 2026-09-02

## Status

Accepted

## Context

A failed mutation must say something in Brazilian Portuguese. Today nothing
does: `trpc/init.ts` configures no `errorFormatter`, so a client receives only
`{ code, httpStatus, path }`, and no component anywhere renders it.

The obvious shape — each mutation hook writes its own `onError` — puts the copy
next to the write that can explain it, and has one failure mode that matters:
the hook that forgets. A mutation with no `onError` fails **silently**. The
button stops spinning, nothing changes, and the Admin has no way to tell a
refused write from a slow one. Silence is the worst available outcome and it is
the default under per-hook copy.

TanStack Query offers a seam that removes the possibility. `MutationCache`'s
`onError` fires for every mutation in the app, before the hook's own and before
the call site's (`mutation.js:117,122`; `mutationObserver.js:97`) — three tiers,
additive, nothing clobbering anything. A handler there cannot be forgotten
because nothing opts into it.

That only relocates the question: where does the *sentence* come from?

Two kinds of failure turn out to want different answers.

**Transport failures** — `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `TIMEOUT`,
`TOO_MANY_REQUESTS`, `INTERNAL_SERVER_ERROR`, and the case where the network
died and `error.data` is absent entirely. These are a fixed enum belonging to
tRPC, and their copy is domain-free: *"Sua sessão expirou."* says nothing about
Products.

**Domain refusals** — a duplicate SKU, a Coupon code already taken, a Variant
that cannot be removed because an Order references it. Only the rule that raised
the error knows why it was raised.

`docs/MODULES.md` already ruled on a case that looks identical and is not:
`ErrorTypes`, mapping Better Auth's codes to pt-BR, was sent to `modules/auth/`
because Better Auth's codes are *domain* facts about signing in. tRPC's codes
are *transport* facts. Same test in ADR-0007 — does this know a shape or a rule
— opposite answer.

For the domain half, letting the procedure write the pt-BR sentence into
`TRPCError`'s `message` is the shortest path, and `trpc/init.ts` already does it
once in `adminProcedure`. The objection is that an *uncaught* server error also
arrives with a `message`, and showing that to a user leaks internals in English.
The objection dissolves on inspection: an uncaught error is always
`INTERNAL_SERVER_ERROR`. Every other code is one a procedure threw on purpose.

## Decision

**Errors surface through three tiers, and the global tier is the default.**

1. **Global.** One `onError` on the `MutationCache` in `makeQueryClient()`
   toasts a pt-BR sentence for every failed mutation. A module-free map from
   tRPC code to copy lives in the global layer beside it; the absent-`data` case
   is one of its entries, not an afterthought.
2. **Module.** A procedure throwing a deliberate refusal writes its own pt-BR
   `message`. **A message present on the error wins over the code map** — except
   for `INTERNAL_SERVER_ERROR`, which always uses the map and never shows its
   message.
3. **Call site.** A form intercepts errors carrying field detail and renders
   them inline.

The tiers are made to cooperate by one rule: **the global handler stays silent
whenever the error carries `data.field` or `data.zodError`.** The presence of a
field payload *is* the signal that something else will render it, so no opt-out
flag, `meta` key or registry is needed.

Carrying those payloads is why `trpc/init.ts` gains an `errorFormatter`: it
attaches `z.treeifyError(cause)` as `data.zodError` for a Zod input failure, and
lifts `cause.field` to `data.field` for a domain conflict that names one.

## Consequences

**No write can fail silently.** That is the property being bought, and it is
bought structurally rather than by convention — there is no hook to forget,
because the safety net is on the cache and not on the mutation.

pt-BR copy for a refusal lives in `server/`, next to the rule that raised it.
That reads oddly against "user-facing copy is pt-BR, code is English" until the
alternative is written out: a client-side table keyed by codes the server must
invent anyway, maintained at a distance from the condition it describes.

The cost is a real coupling: a field-carrying error thrown by a mutation with no
form attached shows the user **nothing**, because the global tier deliberately
stood down for a renderer that was not there. This is accepted on the grounds
that `data.field` and `data.zodError` only ever originate in procedures whose
input is a form. A procedure that starts naming fields outside that context
breaks the assumption quietly, and the fix is to stop naming the field, not to
weaken the rule.

A second cost: three tiers means the answer to "where does this message come
from" is never in one file. The mitigation is that the tiers are ordered by
*specificity* rather than by module, so the search is always the same three
places in the same order.
