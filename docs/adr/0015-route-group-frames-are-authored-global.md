# 15. Route group frames are authored global, not promoted

Date: 2026-09-02

## Status

Accepted

## Context

`app/(admin)/layout.tsx` wraps its children in a `SidebarProvider` with
`<AdminSidebar />`, `<SidebarInset>` and `<AdminHeader />` commented out.
`components/ui/sidebar.tsx` is already generated. The shell is unbuilt, but two
questions about it are architecture rather than markup, and both had to be
settled before any of the eight admin modules could be built.

**Where the shell lives.** ADR-0008 says a module owns one coherent slice of
behaviour — usually an aggregate root, sometimes a flow — and fixes the count at
thirteen. The admin shell owns neither an aggregate nor a flow. It has no
`schemas.ts`, no `server/`, and no audience axis, because it *is* an audience.
So `modules/` fits it badly: `modules/admin/` is the domain-shaped folder
ADR-0008 rejected, and `modules/admin/components/` sitting beside
`modules/products/admin/components/` would make `admin` mean a route-group frame
in one path and an audience in the other.

The global layer fits it badly too, for the opposite reason. A sidebar knows
which eight modules exist, their pt-BR labels and their English route segments.
`components/pagination-nav.tsx` is global precisely because it takes `paramKey`
as a prop and knows no rule; the sidebar is its exact inverse.

A third option — colocating under `app/(admin)/_components/` — was considered
and rejected. It scopes the folder correctly, but the repo has no other
colocated UI under `app/`, and the frame is the kind of thing a developer looks
for under `components/`.

The apparent conflict with the global-layer rule turned out to be narrower than
it first read. **ADR-0007 governs `lib/` and `hooks/`** — that is its Context,
and `docs/CONVENTIONS.md` echoes the same scope. It never mentioned
`components/`. What reaches `components/` is the *promotion* gate in
`docs/MODULES.md`: a component promotes into the global `components/` only when
a second **module** needs it **and** it knows no rule.

The sidebar does not fail shapes-not-rules, because that rule is not about
components. It fails the promotion gate, and for a revealing reason: it was
never inside a module, so it is not being promoted at all.

**How a module gets on the nav.** The alternative to a shell-owned list is a
registry: each module exports an admin nav entry the shell collects. It was
rejected. There is no barrel (`docs/MODULES.md`), so the shell deep-imports
eight files instead of holding one — eight files *and* eight imports. It widens
every module's public surface from code to metadata. It buys dynamic discovery
that a fixed thirteen-module monorepo never uses. And it has nowhere to put
*order*: no module can decide it comes third, so an `order: 30` field appears
and the real decision is smeared across eight files.

## Decision

**`components/` has two tenants, and a component arrives by one of two routes.**

| Route in | Lives at | May know a rule | Imported by |
| --- | --- | --- | --- |
| **Promoted** — a second module needs it *and* it knows no rule | `components/*.tsx` | No | Any module or route |
| **Authored as a frame** — a route group's own furniture | `components/<group>/` | Yes | That group's layout only |

The promotion gate is unchanged. A frame is not promoted: it is authored global
from birth, because it never belonged to a module. It is permitted to know rules
because **the frame is the rule** — a nav that did not know which modules exist
would not be a nav.

The folder shape carries the distinction, so it needs no annotation: a file at
the root of `components/` is promoted and rule-free; a folder under it is a
frame with exactly one owner.

The two instances are **`components/admin/`** and **`components/shop/`**.
`(account)` and `(auth)` get one if and when they need one. A frame folder is
imported by its own route group's layout and by nothing else; that single-owner
property is what keeps it out of the dependency graph the modules form.

Concretely, `components/admin/` holds three *things* — the nav list, the
sidebar, the header — in five files, and is expected to stay five:

```
components/admin/
  nav.ts
  admin-sidebar.tsx
  admin-nav.tsx
  admin-header.tsx
  admin-user-menu.tsx
```

**A frame component is a server component; the leaf that needs a client hook is
split out and named for what it is.** The extra two files are that boundary and
nothing else. `admin-nav.tsx` exists because active state comes from
`useSelectedLayoutSegments()`, and `admin-user-menu.tsx` because the session is
read with `authClient.useSession()` — so the sidebar's chrome and the header's
own markup ship no JavaScript, and the hook sits in the smallest component that
needs it rather than pulling its parent across the line with it.

Neither leaf owns data or a rule, so neither is a module by the test below. A
sixth file is a smell for the same reason a fourth would have been: the frame
splits where the client boundary falls, and nowhere else.

**Anything that owns data or a rule of its own becomes a module and is composed
into the frame.** This is what stops the frame from growing into a junk drawer.
Admin notifications are an aggregate — a table, an unread flag, a `markRead`
procedure — so they are `modules/notifications/`, and the header renders that
module's `<NotificationBell />` exactly as a route composes any module. An admin
search box queries products and belongs to `products`. An impersonation banner
belongs to `auth`. The frame holds the frame.

**The shell owns the nav list; a module declares nothing.** `nav.ts` is one
array. A module gets on the nav when someone adds a line to it — a deliberate,
reviewable act rather than an emergent one. The module contract stays code-only.

An entry is `{ segment, label, icon }` and **`href` is derived** as
`/admin/${segment}`, so identity and destination cannot drift. `label` is pt-BR;
`segment` is English, following ADR-0005. Icons are `lucide-react` component
references, which makes `nav.ts` a client module rather than plain data.

**Active state is read from segments, not from the pathname.** A client
component inside the layout calls `useSelectedLayoutSegments()`, which returns
the segments below `app/(admin)/layout.tsx` — `["admin", "products", "123"]` for
`/admin/products/123`. The module segment is index 1, and it is `undefined` on
`/admin` itself.

This dissolves a special case rather than encoding one. Every admin route starts
with `/admin`, so `pathname.startsWith(href)` would mark Dashboard active
everywhere and need an `exact` flag on that one entry. With segments, Dashboard
is simply the entry whose `segment` is `null`. Nesting is handled for free:
`/admin/products/[id]` and `/admin/products/new` both light Products, because
the comparison only ever looks at one segment.

**The nav is grouped; the groups are wayfinding, not architecture.** Nine links
sit at the edge where a flat list stops reading, so `SidebarGroup` and
`SidebarGroupLabel` (already generated) carry three groups:

| Group | Entries |
| --- | --- |
| *Catálogo* | products, brands, categories |
| *Vendas* | orders, coupons, shipping-methods |
| *Pessoas* | customers, reviews |

Grouping the nav by domain is exactly what ADR-0008 rejected for code, and the
two do not contradict. A sidebar is a wayfinding surface for a human; a folder
tree is a dependency structure. Products and brands sharing a heading says they
are found in the same place, not that they share an owner.

**The header holds the frame and no data.** `<SidebarTrigger />`, a separator, a
"Ver loja" link to `/`, and a user menu with the Admin's name, email and "Sair".
No theme toggle: `next-themes` is not installed. No search, and no page title —
the page owns its own heading.

**The header reads its session on the client**, via `authClient.useSession()` in
the component that needs it. Nothing is fetched in the layout. The accepted cost
is that the name renders empty on first paint and fills in when the session
resolves, so the trigger shows a skeleton rather than shifting layout. "Sair"
goes through `ConfirmProvider`: ADR-0012's list of writes an Admin cannot undo
from the same screen includes logout.

**There are no breadcrumbs.** The page owns its heading and its own "Voltar"
link.

**The sidebar's collapsed state does not survive a reload.** The layout does not
read the `sidebar_state` cookie, so `SidebarProvider` gets no `defaultOpen` and
the sidebar opens expanded every time.

## Consequences

The line through `components/` is now drawable without reading two documents:
a file at the root is shared and rule-free, a folder is one route group's frame.
ADR-0007 keeps its rule and its scope — `lib/` and `hooks/` — and nothing is
superseded. Both that ADR and the Promotion section of `docs/MODULES.md` carry a
pointer here, so neither can be read alone and mislead a reader into "fixing"
`components/admin/` back into a module.

The cost is that `components/` no longer has one uniform admission rule, and the
frame tenant is the weaker-looking half: it may know rules, and its gate is a
judgement — *is this the group's furniture, or is it something with an owner?*
The test that makes it decidable is ownership of data or of a rule beyond "which
links exist". Everything that has either is a module.

The frame is therefore expected not to grow. If `components/admin/` reaches
half a dozen files, the likely reading is that something with an owner was
filed there, not that the frame turned out to be bigger than three things.

Because the shell owns the nav, adding a module to the admin surface is two
acts, not one: build the module, then add its line to `nav.ts`. A module that is
built and not listed is reachable by URL and invisible in the sidebar. That is
the intended failure — a missing nav line is a one-line fix found the first time
anyone looks for the page, whereas a registry's alternative is metadata on
thirteen modules to save eight lines in one file.

Deriving `href` from `segment` fixes admin nav destinations to `/admin/<segment>`
exactly. A future admin surface at a deeper path could not be expressed as an
entry without changing the entry's shape — acceptable, because the eight route
groups map 1:1 onto modules (ADR-0008) and none of them is nested.

Reading active state from `useSelectedLayoutSegments()` ties the sidebar to its
position in the tree: the component works because it is rendered inside
`app/(admin)/layout.tsx` and would silently misread one segment over if it were
rendered from a page. This is the ordinary contract of the hook, and the
single-owner rule above already forbids the move that would break it.

An Admin who collapses the sidebar collapses it again after every reload. The
fix is four lines in the layout whenever that becomes annoying; it is left
undone deliberately rather than overlooked.
