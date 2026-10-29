import {
  PRODUCT_STATUS_OPTIONS,
  type ProductStatus,
} from "@/modules/products/constants";
import { isArchivable, isPublishableStatus } from "@/modules/products/status";

/** Keep the current value visible; offer only the domain's two transitions. */
export function productStatusOptions(status: ProductStatus) {
  return PRODUCT_STATUS_OPTIONS.filter(
    ({ value }) =>
      value === status ||
      (value === "active" && isPublishableStatus(status)) ||
      (value === "archived" && isArchivable(status)),
  );
}

export const PRODUCT_STATUS_DOT_CLASSES: Record<ProductStatus, string> = {
  draft: "bg-muted-foreground",
  active: "bg-emerald-600",
  archived: "bg-red-600",
};
