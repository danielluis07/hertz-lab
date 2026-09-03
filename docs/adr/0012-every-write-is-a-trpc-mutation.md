# 12. Every write is a tRPC mutation

Date: 2026-09-02

## Status

Accepted

## Context

The read path (ADR-0011) settled how a page gets data, and every mechanism it
names is tRPC. Nothing has said the same about writes, and in Next 16.3 that
silence is load-bearing rather than harmless.

The framework's own default answer for a form is a Server Action: `<form
action={…}>` needs no client component, no request waterfall and no schema
shipped to the browser. Next 16.3 adds `refresh()` in `next/cache`, which
re-renders the client router from inside an action, and the docs point at it
from the Server Actions guide. A contributor reaching for an action to save a
Product would be following the framework, not fighting it.

The pull is strongest exactly where the map's fog already sits. Uploading a
product image to S3 has an obvious action-shaped solution — take the
`FormData`, call `lib/s3.ts` on the server, return a URL — that avoids
presigning entirely.

So the question is whether admin runs one write path or two.

**Two paths** was considered on its merits. Actions genuinely win on the
no-JavaScript form and on anything that is mostly a file moving to a bucket, and
tRPC genuinely wins where a mutation must invalidate a client cache the action
knows nothing about. Splitting on those lines is defensible in isolation.

What sinks it is that everything downstream of a write is *shared* machinery.
ADR-0013 puts a single handler on the TanStack `MutationCache` and makes it the
reason no write can fail silently. A Server Action never enters that cache: it
has its own error channel (a thrown error crossing the RSC boundary, or a
returned result object), its own copy story, and its own refresh mechanism in
`refresh()` rather than `invalidateQueries`. Two write paths therefore means two
error shapes, two places pt-BR copy lives, two invalidation stories, and a
global safety net that covers half the writes in the app while reading as though
it covers all of them.

The `adminProcedure` guard is a second, smaller cost. Authorisation for reads
and writes currently has one implementation; an action would need its own check
and its own `FORBIDDEN` copy.

## Decision

**Every write in Hertz Lab is a tRPC mutation. There are no Server Actions.**

The consequences that make this concrete:

- A form is a client component. It runs React Hook Form against the module's
  `schemas.ts` and submits through a module-owned mutation hook.
- `refresh()` from `next/cache` is unreachable in this codebase and should never
  appear in it. Where the RSC tree must re-render, the client calls
  `router.refresh()` from `useRouter` — see `docs/DATA-FLOW.md`.
- **S3 upload goes presigned-URL-from-a-procedure.** An `adminProcedure` mints
  the URL, the browser puts the file to S3 directly, and the resulting key
  travels through an ordinary mutation. `lib/s3.ts` stays behind the same guard
  as every other server capability and the file never transits the app server.

## Consequences

One write path means one error shape, one copy channel, one invalidation story,
and one authorisation guard. `MutationCache.onError` covers *every* write in the
admin surface, which is what lets ADR-0013 treat a global handler as a genuine
net rather than a partial one.

The cost is real and worth naming so it is not rediscovered as a bug. **Admin
forms do not work without JavaScript**, and progressive enhancement — the thing
Server Actions exist to give back — is given up deliberately. For an internal
surface behind an admin login this is an acceptable trade; for the shop it may
not be, and this ADR speaks only for admin. A future decision to use actions on
the shop side would not contradict this one.

The second cost falls on image upload: presigning is more moving parts than
handing `FormData` to a server function, and it introduces the orphaned-object
problem (a file lands in S3 before the row referencing it exists, or instead of
it). That problem is real and is not solved here.

**Resolved by ADR-0018.** Upload is eager, the key is a form value, and orphans
are tolerated deliberately rather than swept — this repo has no scheduled runner
to sweep with.
