"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useProductStatus } from "@/modules/products/admin/hooks/use-product-status";
import { PRODUCT_STATUS_DOT_CLASSES } from "@/modules/products/admin/status-options";
import {
  PRODUCT_STATUS_LABELS,
  type ProductStatus,
} from "@/modules/products/constants";

export function ProductStatusSelect({
  id,
  name,
  status,
}: {
  id: string;
  name: string;
  status: ProductStatus;
}) {
  const productStatus = useProductStatus(id, status);

  return (
    <Select<ProductStatus>
      value={productStatus.status}
      onValueChange={productStatus.changeStatus}
      disabled={productStatus.isPending}
      items={productStatus.options}>
      <SelectTrigger
        size="sm"
        aria-label={`Status de ${name}`}
        aria-busy={productStatus.isPending}
        className="w-36 border-transparent hover:border-input focus-visible:border-ring">
        <SelectValue>
          <span
            aria-hidden="true"
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              PRODUCT_STATUS_DOT_CLASSES[productStatus.status],
            )}
          />
          {PRODUCT_STATUS_LABELS[productStatus.status]}
          {productStatus.isPending && <Spinner />}
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="start" alignItemWithTrigger={false}>
        <SelectGroup>
          {productStatus.options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.value === productStatus.status}>
              <span
                aria-hidden="true"
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  PRODUCT_STATUS_DOT_CLASSES[option.value],
                )}
              />
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
