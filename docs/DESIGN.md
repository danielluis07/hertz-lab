# Design

The visual direction of the **Storefront** — every route group except
`(admin)`. The admin keeps stock shadcn neutral and Inter, and nothing here
applies to it; how the two are kept apart is ADR-0027.

This file holds **tokens and the rules that govern them**. It does not specify
components. A product card, a header, an empty state are designed where they
are built, constrained by what is written here. If this file ever describes
markup, it has drifted.

## The position

Hertz Lab is an instrument, not a marketplace. The reference is a well-made
piece of audio hardware: a cool paper ground, near-black ink, hairline rules,
one indicator light. Colour comes from the product photography and almost
nowhere else. Specifications are treated as a feature the shopper came for, not
as fine print below the fold.

The idiom being deliberately rejected is mainstream Brazilian e-commerce —
flooded orange and red, urgency badges, price-first density. The difference is
rarely the hue; it is the **area**. Every rule below that looks restrictive is
enforcing that one distinction.

## Colour

Defined in `app/globals.css`. The four that carry the direction:

| Token | Value | Is |
| --- | --- | --- |
| `--background` | `oklch(0.985 0.004 240)` | Cool near-white paper. Never `#fff`. |
| `--foreground` | `oklch(0.16 0.005 60)` | Warm ink. Never `#000`. |
| `--primary` | `oklch(0.55 0.18 38)` | Signal vermilion. |
| `--border` | `oklch(0.9 0.004 85)` | Hairline. |

**The accent appears on at most one element per viewport, and never as a fill
larger than a button.** This is the rule that makes vermilion read as an
indicator light rather than as a sale banner, and it is the single rule most
likely to be broken by accident. A page with two vermilion fills has a bug.

In practice: the primary action of the page is a `default` Button. Everything
else that is a button is `outline`, `secondary` or `ghost`. A category page has
one — "Comprar" on the featured item, or nothing at all.

**`--primary` is held at L=0.55 on purpose.** A brighter vermilion is prettier
and fails WCAG AA with white text at button sizes. Do not lighten it without
re-checking the contrast of `--primary-foreground` against it.

**Destructive is never a filled button in the Storefront.** `--destructive` and
`--primary` are in the same colour family, so two fills side by side are
ambiguous — "Comprar" and "Remover" must not look like siblings. Destructive
acts (remove from cart, delete an address) are rendered as ghost or link
buttons using the destructive foreground. The admin has no such constraint.

**`--accent` is not the accent.** It is shadcn's hover-surface token and it is a
near-neutral grey here. The brand accent is `--primary`. This trap is worth
knowing before someone "fixes" `--accent` to vermilion and turns every hover
state orange.

**A card shares the paper.** `--card` equals `--background`; a card is defined
by its border and the space around it, never by a fill. Only floating surfaces
(`--popover`) lift to white.

## Typography

Two families, both loaded in `fonts/index.ts`.

- **IBM Plex Sans** (`font-sans`) — everything the shopper reads.
- **IBM Plex Mono** (`font-mono`, weights 400 and 500) — technical data only.

**Headings differ from body by weight, size and tracking — never by family.**
A second face for headings was considered and rejected twice over.

The position rejects it: hardware panels label in one face at varying weights,
and a display or serif heading is the editorial-magazine move this store is not
making. It also costs a third font payload on pages where LCP is revenue.

The token that looks like the vehicle for it is not one. `--font-heading` is
applied in exactly three places — `Card`, `Dialog` and `Sheet` titles — all at
`text-base`. It means *UI title*, not *page heading*: pointing it at a second
family would dress 16px card labels in a display face while leaving every actual
`<h1>` untouched, and would follow into the admin unless overridden there too.
It is aliased to `--font-sans` and stays that way.

If headings ever read as flat, the range to reach for is **inside** Plex Sans:
its variable font carries a `wdth` axis, so `axes: ["wdth"]` in `fonts/index.ts`
plus Tailwind's `font-stretch-*` utilities buys condensed display headings with
no second family. That is deliberately not loaded yet — the axis enlarges the
font file, and there is no hero to judge it against. A genuine second family, if
it is ever justified, gets a new `--font-display` token that heading markup opts
into; it never reuses `--font-heading`.

**Mono is for what the shopper compares character by character**: Specification
values, SKUs, order numbers, tracking codes. **Never prices.** A price is
ordinary sans text with `tabular-nums`, which keeps `R$ 1.299,00` aligned down a
column without making the store look like a receipt printer.

**Weight tops out at 600.** Plex at 700+ reads as shouting, and shouting is the
rejected idiom. Body is 400; headings are 500; 600 is for the rare label that
must win against a photograph.

The scale, as Tailwind classes:

| Role | Class |
| --- | --- |
| Display (home hero only) | `text-5xl md:text-6xl font-medium tracking-tight` |
| Page heading | `text-3xl md:text-4xl font-medium tracking-tight` |
| Section heading | `text-xl md:text-2xl font-medium tracking-tight` |
| Card / product title | `text-base font-medium` |
| Body | `text-base` — `text-sm` in dense contexts |
| Meta / label | `text-xs uppercase tracking-wide text-muted-foreground` |

Negative tracking is applied from `text-xl` up and never below it: it tightens
large type and damages small type.

## Radius and density

`--radius` is `0.25rem` — crisp, not soft, not square. Square reads brutalist,
which is a different store. The admin stays at `0.625rem`.

Density splits by scale: **tight inside a component, generous between
components.** Component internals sit on the 4px rhythm (`gap-2`, `p-4`).
Sections do not: `py-16 md:py-24` between them. A page whose sections are 32px
apart is a dashboard.

## Layout

- Content container: `mx-auto w-full max-w-7xl px-6` (1280px, 24px gutters).
- Product grid: 2 columns on mobile, 3 on tablet, 4 on desktop,
  `gap-x-6 gap-y-10`.
- Product images are square and this is not negotiable here — ADR-0021 fixes it
  at the data layer. At 1280px with 4 columns a Cover renders near 290px.
- **Full-bleed is permitted only for the home hero and category strips.** Text
  never exceeds the container, on any surface.
- The home Hero uses the committed 2400 × 1350 photograph at 4:3 on mobile and
  16:9 from the medium breakpoint, capped at 70svh. Its essential subject stays
  inside the central 1800 × 1350 safe region so both crops survive. The text
  panel follows the photograph and never overlays it (ADR-0028).

## Elevation

**Borders for everything that sits on the page; shadows only for what floats
over it** — dropdown, dialog, popover, toast, sheet.

That gives a shadow exactly one meaning: *temporary, and above*. A shadow on a
product card would spend that meaning on decoration and leave nothing to say
"this is a layer". Hairline borders are also what instrument panels actually
use.

## Motion

Near zero, and this is a decision rather than an omission.

- 150ms `ease-out` on interactive state — hover, focus, open/close.
- **No scroll-triggered reveals. No parallax. No entrance animation on
  content.** Scroll animation is the fastest way to make a curated store feel
  like a landing-page template, and on a catalogue it costs the shopper time on
  every visit.
- `prefers-reduced-motion` is honoured wherever a transition exists.

## Light only

The Storefront ships light-only. `next-themes` is not installed, the `.dark`
block in `globals.css` is dormant, and no toggle exists on any surface.

The reason is cost, not taste: a theme doubles every token decision, every
accent placement and every image treatment, and a shop whose product photos are
shot on white backgrounds looks worse for the trouble. Reversing this is a small
act — install `next-themes`, fill in the dark block — and it is deliberately
left undone.

## What this file does not decide

Component design. The frame (`components/shop/` — header, footer, nav, cart
affordance) is a design problem of its own and is not settled here. Neither is
the logo: **Hertz Lab is a wordmark set in Plex Sans** until there is a reason
for it not to be.
