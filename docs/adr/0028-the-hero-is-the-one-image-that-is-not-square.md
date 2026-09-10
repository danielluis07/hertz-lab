# 28. The home hero is a committed asset, and the one image that is not square

Date: 2026-09-08

## Status

Accepted

## Context

ADR-0021 settled that photographs in Hertz Lab are square — Product Images and
the Category picture alike — and it did more than state a preference: the admin
upload form *refuses bytes that are not square*, naming what it got. "Every
image in this store is square" is therefore a rule with an enforcement point,
and a reader who finds a wide image will reasonably assume it is a bug.

`DESIGN.md` grants the home hero the display type scale and one of only two
full-bleed permissions in the Storefront, but never says what the hero contains.
When that was settled (`docs/STOREFRONT.md`), the answer was a wide photograph:
`aspect-[4/3] md:aspect-[16/9]`.

A square photograph cannot serve. ADR-0021 already documents that a non-square
object "renders center-cropped in every surface" — forcing a 1:1 shot into a
16:9 band loses its subject, which is exactly the failure that ADR anticipates
and tolerates only because the surfaces it describes are small tiles. A hero is
not a tile.

So the hero needs an image the data model cannot supply, and the question is
where it comes from.

## Decision

**The home hero photograph is a static asset committed to the repository, and
it is the only image in the Storefront that is not square.**

It lives under `public/images/`, is imported statically so `next/image` receives
its intrinsic dimensions and blur data, and carries `preload` with an explicit
responsive `sizes` value — it is the LCP element of the store's most-visited
page. `priority` was the name in the original decision, but Next 16 deprecates
it in favour of `preload`; this wording follows the bundled Next 16.3.4 docs.
The pattern is the one ADR-0021 already established for
`image-placeholder.jpg`.

The asset is commissioned at **2400 × 1350** with its essential subject inside
the central **1800 × 1350** safe region, so both the `4/3` mobile crop and the
`16/9` desktop crop survive. Rendered height is capped at `70svh`.

Changing the hero is a commit.

### Considered and rejected

**An admin-managed hero.** A settings row or a table with its own upload and its
own admin surface. This is the shape that would let a non-developer change the
hero, and it was rejected for two reasons. It contradicts the governing choice
of `docs/STOREFRONT.md` — that the Storefront carries no curation schema and
every section is a derived query — and it requires a *second* aspect-ratio rule
in the upload path, so the codebase would hold two competing definitions of "the
right shape for an image" with only the call site to tell them apart.

**Reusing a Category picture, cropped wide.** Free, and wrong twice over: the
crop destroys the subject, and `CONTEXT.md` defines the Category picture as
decoration — "never a photograph of anything for sale". A display headline and
the page's only vermilion action are not things to hang on decoration.

**A hero that features one Product.** This is the e-commerce reflex, and with no
`featured` flag it can only be a slug hardcoded in a constants file — curation
by deploy, wearing the costume of derived data. The hero's action therefore goes
to `/produtos`, which is honest about what the store actually knows.

## Consequences

**ADR-0021's rule now has exactly one exception, and it is nameable.** The
diagnosis for "why is this image not square" is this file. ADR-0021 carries a
pointer here so the rule and its exception are readable from either end.

**Nothing enforces the hero's ratio.** There is no upload path and therefore no
refusal — the guard is that the asset is a file in a diff, reviewed by a human.
A replacement of the wrong shape will render center-cropped and no error will
say so. That is a smaller risk than the one an admin upload path would create,
but it is a real one and it is stated here rather than discovered.

**Reversing this is contained.** If the store later wants a swappable hero, it
is a migration plus one admin surface — and it should be its own decision, taken
because someone needs it, not inherited quietly from this one.
