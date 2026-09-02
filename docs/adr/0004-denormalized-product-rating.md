# 4. Product rating is denormalised

Date: 2026-09-01

## Status

Accepted

## Context

Shoppers filter and sort the catalog by rating, and every Product card shows
its average and review count. Computed honestly, that is an aggregate over
`review` — grouped, filtered to approved rows — joined into every listing
query, on the page that must be fastest in the whole store.

Reviews change rarely. Listing pages are read constantly. The ratio is roughly
the worst case for computing on read.

## Decision

`product.rating_average` and `product.rating_count` are stored columns,
recalculated whenever a Review's moderation status changes — on approval, on
rejection, and on deletion of an approved Review.

`rating_average` is an integer in hundredths (450 means 4.50), consistent with
money being stored in cents.

## Consequences

This trades a correctness guarantee for read performance, and the trade should
be explicit: the columns are now derived data that the database does not
maintain. If the recalculation is skipped on any path that changes a Review's
visibility, the store displays a number that is quietly wrong, and nothing
fails loudly to say so.

Two things follow from that. Every write path that approves, rejects or removes
a Review must recalculate in the same transaction — there is no second place
allowed to touch these columns. And a recalculation routine that can rebuild
both columns for a Product from scratch should exist from the start, so drift
is repairable rather than permanent.

The alternative considered was a database view or a materialised view.
A plain view solves nothing — it is the join, renamed. A materialised view
moves the staleness problem to a refresh schedule and makes per-Product
freshness impossible, which is worse for exactly the case that matters: a
shopper who has just posted a review and wants to see it counted.
