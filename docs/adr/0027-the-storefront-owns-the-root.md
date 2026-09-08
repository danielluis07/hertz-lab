# 27. The Storefront owns `:root`; the admin is the exception

Date: 2026-09-08

## Status

Accepted

## Context

`app/globals.css` held one set of tokens: stock shadcn neutral, `--radius:
0.625rem`, Inter on `--font-sans`. Both audiences rendered from it, which was
fine while the Storefront was unbuilt — every `(shop)`, `(auth)` and `(account)`
page is still a stub — and stops being fine the moment the Storefront gets a
palette of its own (`docs/DESIGN.md`).

The admin keeps stock shadcn deliberately. It is an internal tool, its density
and neutrality are correct for the job, and nothing about it should track the
brand. So the two audiences need two token sets out of one stylesheet, one
`<html>` element and one root layout.

Three things made this less obvious than it looks.

**The split does not follow a route group.** "Everything except the admin" spans
`(shop)`, `(auth)` and `(account)`. There is no single existing boundary to hang
it on, and `(shop)` is a bad name for the union because it is also the name of
one of its three members.

**The root layout cannot know the route.** `app/layout.tsx` owns `<html>`, and
nothing below it can add a class there. Reading the path from a header set by
`proxy.ts` and applying the class in the root layout would work, but `headers()`
opts the layout into dynamic rendering — for *every* route, including the
product pages that most want to be static. Multiple root layouts, one per group,
would duplicate `TRPCReactProvider` and force a full document load on every
crossing between them.

**Portalled surfaces escape any subtree.** `components/ui/dialog.tsx` renders
through `DialogPortal` into `<body>`, and `Toaster` does the same. A class on a
wrapper `<div>` inside the admin layout would style the admin's pages and leave
its dialogs, popovers and toasts reading Storefront tokens — the failure would
appear only on interaction, which is the worst kind.

## Decision

**`:root` is the Storefront. The admin opts out.**

The majority surface is the unannotated one. The admin — one route group of
four, an internal tool — carries the exception, because an exception is the
thing that should be marked. The inverse (stock `:root`, a `.shop` class on
three layouts) was rejected: it puts the rule in three files instead of one, and
forgetting it on `(auth)` renders the login page in admin clothing without any
error.

**The opt-out is a marker class hoisted to the root with `:has()`.**

```css
:root:has(.admin) { --font-sans: var(--font-inter); --primary: …; --radius: 0.625rem; }
```

`app/(admin)/layout.tsx` puts `className="admin"` on its `SidebarProvider`. The
class carries no styles; its only job is to exist in the document. `:has()` then
promotes the admin token set to the root, so `<body>` and everything portalled
into it inherits the same values as the admin's own subtree. This is
server-rendered with no flash, needs no client hook, and leaves the root layout
statically renderable.

`:root:has(.admin)` has specificity (0,2,0), which beats both the bare `:root`
block and the `next/font` class that `next/font` puts on `<html>` — so the font
override lands without `!important` and without ordering games.

**Only the tokens that differ are restated.** The admin block redeclares
colour, `--radius` and `--font-sans`. `--chart-*` and `--sidebar-*` are left in
`:root`: the Storefront has no charts and no sidebar, so those values are the
admin's already and duplicating them would create two places to edit one thing.

**The fonts stop overlapping.** `Geist` was loaded in `fonts/index.ts` and used
by nothing; it is deleted. IBM Plex Sans claims `--font-sans` and IBM Plex Mono
claims `--font-mono` in the ordinary `next/font` way, so the Storefront needs no
`:root` font declaration at all. Inter is renamed to `--font-inter` and is
pointed at by the admin block alone.

## Consequences

Adding a Storefront token means editing one block. Adding an admin token means
editing two — the value in `:root` and its override — and forgetting the second
half means the admin quietly inherits a brand colour. That is the cost of
inversion, and it is paid by the surface that changes least.

The `.admin` class is load-bearing and looks decorative. A reader tidying up
`app/(admin)/layout.tsx` would find a class with no styles attached to it and
have every reason to delete it; deleting it repaints the entire admin in
Storefront vermilion. The comment above it in that file, and this ADR, are the
only things preventing that.

The mechanism depends on `:has()`. It is supported everywhere the rest of this
stack is, but it is a selector doing structural work, and it is worth knowing
that a build step or a CSS minifier that mangles `:has()` would fail silently
rather than loudly.

A second audience wanting its own palette follows the same shape: a marker class
and a `:root:has()` block. If a third ever appears the pattern stops scaling
well, and the honest answer at that point is separate root layouts, accepting
the document reload between them.

`shadcn add` may regenerate components that reference tokens, but it does not
rewrite `globals.css` token blocks — only `shadcn init` does, and that has
already run. Re-running `init` would silently restore stock `:root` and erase
the Storefront palette.
