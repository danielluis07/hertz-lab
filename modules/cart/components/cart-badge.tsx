"use client";

import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { formatBadgeCount, formatUnits } from "@/modules/cart/format";
import { useTRPC } from "@/trpc/client";

/**
 * The count on the header's Cart link, composed into the shop frame the way a
 * module's view of its own aggregate is (ADR-0015, ADR-0042). The link and its
 * icon are static frame markup; only this number resolves per visitor
 * (ADR-0034).
 *
 * - **It reads `cart.get` and selects `totalQuantity`.** There is no count
 *   procedure: one key means every Cart write that invalidates the page
 *   invalidates this too, so the badge cannot disagree with the Cart it
 *   links to.
 * - **Cold**, neither prefetched nor hydrated — hydration is a property of a
 *   page, never of the frame. `/carrinho` prefetches the same key.
 * - **Gated on the session**, so a logged-out visitor fires no request: there
 *   is no guest Cart, and the procedure is protected.
 * - **Nothing until a non-zero count resolves.** Not `0`, which is false for a
 *   logged-out visitor, and no skeleton, which would flash on every page for
 *   the majority who never see a number. Absolutely positioned, so its
 *   arrival shifts nothing. The session check also covers a Cart cached from
 *   a session that has since ended, which a disabled query still returns.
 *
 * Ink rather than vermilion: the accent is the page's one element per
 * viewport (`docs/DESIGN.md`), and the frame is on every page.
 */
export function CartBadge() {
  const trpc = useTRPC();
  const { data: session } = authClient.useSession();
  const { data: count } = useQuery(
    trpc.cart.get.queryOptions(undefined, {
      enabled: !!session,
      select: (cart) => cart.totalQuantity,
    }),
  );

  if (!session || !count) return null;

  return (
    <span className="bg-foreground text-background pointer-events-none absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-sm px-1 text-[0.625rem] leading-none font-medium tabular-nums">
      <span aria-hidden>{formatBadgeCount(count)}</span>
      <span className="sr-only">, {formatUnits(count)}</span>
    </span>
  );
}
