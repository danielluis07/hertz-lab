/**
 * Class merging, re-exported so `@/lib/utils` stays the import path every
 * shadcn component is generated with.
 *
 * `cn` replaces `clsx` + `tailwind-merge` with a single dependency and the
 * same API. If the theme ever needs teaching — `font-heading` and the extended
 * radius scale in `app/globals.css` are the candidates — swap this for
 * `createCn()` from `cn/config`; nothing else has to change.
 */
export { cn } from "cn";
