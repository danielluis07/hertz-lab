/**
 * `@/lib/utils` resolves here, which is the path shadcn writes into every
 * generated component. It re-exports `cn` and nothing else on purpose: a
 * barrel over the whole directory would pull `env`, the formatters and the
 * Intl instances into every bundle that only wanted a class name.
 *
 * Import everything else from its own module — `@/lib/utils/format`,
 * `@/lib/utils/document`, and so on.
 */
export { cn } from "@/lib/utils/cn";
