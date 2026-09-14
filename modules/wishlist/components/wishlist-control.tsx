"use client";

import Link from "next/link";
import { HeartIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { loginHref } from "@/modules/auth/redirects";
import { useSaveWishlistItem } from "@/modules/wishlist/hooks/use-save-wishlist-item";
import { useUnsaveWishlistItem } from "@/modules/wishlist/hooks/use-unsave-wishlist-item";
import { useTRPC } from "@/trpc/client";

/**
 * The Wishlist control for one selected Variant. The Product page composes it
 * beside the Variant it has selected; a Product card never does, because a
 * card has no Variant to save (ADR-0045).
 *
 * - **Membership is a cold `useQuery`**, gated on the session and never
 *   prefetched or hydrated: the Product route is static, and a protected
 *   read on the server would make it dynamic (ADR-0032).
 * - **No guessed state.** While the session or membership resolves, the
 *   control shows a spinner rather than an empty or filled heart that might
 *   be wrong.
 * - **Anonymous is a link**, to `/login` with this Product as the return. The
 *   save is not remembered: the shopper presses it again after signing in.
 * - **Server-authoritative.** A write disables the control until the
 *   invalidated membership refetches; the heart only changes when the server
 *   says it has.
 *
 * Icon-only, with a constant name and `aria-pressed` carrying the state, as a
 * toggle button should. Ink, never vermilion: the page's one accent is its
 * Cart action (DESIGN.md).
 */
export function WishlistControl({
  variantId,
  productSlug,
  className,
}: {
  variantId: string;
  /** The Product route an anonymous shopper returns to after signing in. */
  productSlug: string;
  className?: string;
}) {
  const trpc = useTRPC();
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const membership = useQuery(
    trpc.wishlist.isSaved.queryOptions(
      { variantId },
      { enabled: !!session },
    ),
  );
  const save = useSaveWishlistItem();
  const unsave = useUnsaveWishlistItem();

  const label = "Salvar nos favoritos";

  if (isSessionPending) return <ResolvingControl className={className} />;

  if (!session) {
    return (
      <Button
        variant="outline"
        size="icon-lg"
        className={className}
        aria-label={label}
        title={label}
        nativeButton={false}
        render={<Link href={loginHref(`/produto/${productSlug}`)} />}>
        <HeartIcon />
      </Button>
    );
  }

  if (membership.isError) return null;
  if (membership.isPending) return <ResolvingControl className={className} />;

  const saved = membership.data;
  const isWriting = save.isPending || unsave.isPending;

  return (
    <Button
      variant="outline"
      size="icon-lg"
      className={className}
      aria-label={label}
      title={saved ? "Remover dos favoritos" : label}
      aria-pressed={saved}
      disabled={isWriting}
      onClick={() =>
        saved ? unsave.mutate({ variantId }) : save.mutate({ variantId })
      }>
      {isWriting ? (
        <Spinner aria-hidden />
      ) : (
        <HeartIcon className={cn(saved && "fill-current")} />
      )}
    </Button>
  );
}

/** The control's box while its state is unknown: busy, never pressed. */
function ResolvingControl({ className }: { className?: string }) {
  return (
    <Button
      variant="outline"
      size="icon-lg"
      className={className}
      aria-label="Verificando favoritos"
      aria-busy
      disabled>
      <Spinner aria-hidden />
    </Button>
  );
}
