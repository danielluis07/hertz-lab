"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { ReviewForm } from "@/modules/reviews/shop/components/review-form";
import { useTRPC } from "@/trpc/client";

/**
 * The visitor-specific half of a Product's Reviews, independent of the public
 * list and placed by the Product page.
 *
 * - **A cold `useQuery`, gated on the session**, never prefetched, loaded or
 *   hydrated: `writingState` is a protected read, and running it on the server
 *   would read headers and make the cached Product route dynamic (ADR-0032).
 * - **Nothing is guessed.** An unresolved session, a signed-out visitor, a
 *   pending query and an `ineligible` shopper all render nothing — no teaser,
 *   no disabled form that might turn out to be wrong.
 * - **The persisted Review wins.** `pending`, `approved` and `rejected` are
 *   notices, and `rejected` never offers another form: its slot stays taken.
 *
 * It informs rendering only. `reviews.shop.create` re-proves everything.
 */
export function ReviewWriter({ productId }: { productId: string }) {
  const trpc = useTRPC();
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const writing = useQuery(
    trpc.reviews.shop.writingState.queryOptions(
      { productId },
      { enabled: !!session },
    ),
  );

  if (isSessionPending || !session) return null;

  if (writing.isError) {
    return (
      <WriterPanel>
        <p role="alert" className="text-muted-foreground text-sm">
          Não foi possível verificar se você pode avaliar este produto.
        </p>
        <Button
          variant="outline"
          className="self-start"
          disabled={writing.isFetching}
          focusableWhenDisabled
          aria-busy={writing.isFetching}
          onClick={() => writing.refetch()}>
          {writing.isFetching && <Spinner aria-hidden data-icon="inline-start" />}
          Tentar novamente
        </Button>
      </WriterPanel>
    );
  }

  if (writing.isPending) return null;

  switch (writing.data.state) {
    case "ineligible":
      return null;

    case "eligible":
      return (
        <WriterPanel>
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-medium">Avalie este produto</h3>
            <p className="text-muted-foreground text-sm">
              Sua compra foi entregue. Conte como está sendo a experiência.
            </p>
          </div>
          <ReviewForm productId={productId} />
        </WriterPanel>
      );

    case "pending":
      return (
        <WriterNotice title="Sua avaliação está em moderação">
          Recebemos sua avaliação. Ela aparecerá aqui assim que for aprovada.
        </WriterNotice>
      );

    case "approved":
      return (
        <WriterNotice title="Sua avaliação foi publicada">
          Obrigado por compartilhar sua experiência com este produto.
        </WriterNotice>
      );

    case "rejected":
      return (
        <WriterNotice title="Sua avaliação não foi publicada">
          Após a moderação, sua avaliação deste produto não foi aprovada para
          publicação.
        </WriterNotice>
      );
  }
}

/** The island's hairline box — the paper shared, as a card is (DESIGN.md). */
function WriterPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6 rounded-lg border p-6">{children}</div>
  );
}

/** A persisted Review's state, announced as it replaces the form. */
function WriterNotice({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" className="flex flex-col gap-1 rounded-lg border p-6">
      <p className="font-medium">{title}</p>
      <p className="text-muted-foreground text-sm">{children}</p>
    </div>
  );
}
