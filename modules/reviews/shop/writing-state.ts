type ReviewModerationStatus = "pending" | "approved" | "rejected";

/** Resolve the single writing state after the procedure fetches both facts. */
export function reviewWritingState({
  existingStatus,
  hasDeliveredOrder,
}: {
  existingStatus: ReviewModerationStatus | undefined;
  hasDeliveredOrder: boolean;
}) {
  return existingStatus ?? (hasDeliveredOrder ? "eligible" : "ineligible");
}
