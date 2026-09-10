/**
 * The TanStack mutation scope every Cart write runs in. Mutations sharing a
 * scope run one at a time, in the order they were fired — each one's
 * optimistic change still lands at once, only the requests queue.
 *
 * One scope for the whole Cart rather than one per Variant: the server
 * serialises a shopper's Cart writes on the Cart row lock anyway
 * (`server/queries.ts`), so a finer client scope would buy no concurrency —
 * and a removal fired while that line's quantity change is in flight must not
 * overtake it and turn the change into a `NOT_FOUND`.
 */
export const CART_WRITE_SCOPE = { id: "cart" } as const;
