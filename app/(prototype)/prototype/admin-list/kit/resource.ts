/**
 * PROTOTYPE — shape (a): a config-driven resource kit.
 *
 * A module declares its columns, filters and fields; a shared engine renders
 * the table. This file is the contract between the two.
 */

import type { ReactNode } from "react";
import type { SortDirection } from "../sort";

/** What the engine must be able to assume about any list's input. */
export type BaseListInput = {
  search?: string;
  sortBy: string;
  sortOrder: SortDirection;
  page: number;
};

export type ResourceColumn<TRow, TSortBy extends string> = {
  header: string;
  cell: (row: TRow) => ReactNode;
  /** Present makes the header an anchor. Typed to the input's own sort union. */
  sortKey?: TSortBy;
  align?: "start" | "end";
  headerClassName?: string;
};

/** Filter keys are whatever is left of the input once the plumbing is removed. */
type FilterKey<TInput> = Exclude<
  keyof TInput & string,
  "search" | "sortBy" | "sortOrder" | "page"
>;

export type ResourceFilter<TInput extends BaseListInput> =
  | { kind: "search"; placeholder: string }
  | {
      kind: "select";
      key: FilterKey<TInput>;
      label: string;
      options: readonly { value: string; label: string }[];
    };

export type ResourceDefinition<TRow, TInput extends BaseListInput> = {
  /** pt-BR plural, for the heading and the empty state. */
  title: string;
  /** Absent on the three surfaces with no create page: orders, customers, reviews. */
  createHref?: string;
  createLabel?: string;
  rowKey: (row: TRow) => string;
  rowHref: (row: TRow) => string;
  columns: ResourceColumn<TRow, TInput["sortBy"]>[];
  filters: ResourceFilter<TInput>[];
  /** Per-field default direction — the same table `params.ts` already holds. */
  sortDefaults: Record<TInput["sortBy"], SortDirection>;
  perPage: number;
  emptyMessage: string;
};

/** Identity, but it makes both type parameters inferable at the call site. */
export function defineResource<TRow, TInput extends BaseListInput>(
  definition: ResourceDefinition<TRow, TInput>,
): ResourceDefinition<TRow, TInput> {
  return definition;
}
