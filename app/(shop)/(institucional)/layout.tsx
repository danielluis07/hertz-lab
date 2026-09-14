/**
 * The measure and the prose scope for the five institucional pages, and
 * nothing else (`docs/STOREFRONT.md`). No heading, no sidebar, no table of
 * contents: a layout cannot know a page's title, so each page owns its `<h1>`,
 * its `metadata` and every word of its copy.
 *
 * The scope styles plain elements so the pages stay classless JSX prose — a
 * page is an `<article>` whose `<header>` holds the `<h1>` and, on the three
 * legal pages, the last-updated line as its `<p>`. There is no
 * `@tailwindcss/typography`: its defaults (700-weight `strong`, coloured links)
 * break `docs/DESIGN.md` in more places than it saves.
 *
 * Reads nothing, so every page beneath it stays static (ADR-0035).
 */
const PROSE = [
  // Page heading, and the meta line beneath it.
  "[&_header]:mb-10 [&_header]:flex [&_header]:flex-col [&_header]:gap-3 md:[&_header]:mb-12",
  "[&_h1]:text-3xl [&_h1]:font-medium [&_h1]:tracking-tight [&_h1]:text-balance md:[&_h1]:text-4xl",
  "[&_header>p]:text-muted-foreground [&_header>p]:text-xs [&_header>p]:tracking-wide [&_header>p]:uppercase",
  // Section headings open on a hairline rule, as a panel section would.
  "[&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:border-t [&_h2]:pt-8 [&_h2]:text-xl [&_h2]:font-medium [&_h2]:tracking-tight md:[&_h2]:text-2xl",
  // Body blocks.
  "[&_:is(p,ul,ol,dl)+:is(p,ul,ol,dl)]:mt-4 [&_p]:leading-7",
  "[&_:is(ul,ol)]:pl-5 [&_ol]:list-decimal [&_ul]:list-disc",
  "[&_li]:mt-2 [&_li]:pl-1 [&_li]:leading-7 [&_li]:marker:text-muted-foreground",
  "[&_dt]:text-muted-foreground [&_dt]:text-xs [&_dt]:tracking-wide [&_dt]:uppercase [&_dd]:mt-1 [&_dd+dt]:mt-6",
  // Weight tops out below bold; ink links, told apart by their underline alone.
  "[&_strong]:font-medium",
  "[&_a]:break-words [&_a]:underline [&_a]:decoration-muted-foreground [&_a]:decoration-1 [&_a]:underline-offset-4 [&_a]:transition-colors [&_a]:duration-150 [&_a]:ease-out [&_a]:hover:decoration-foreground motion-reduce:[&_a]:transition-none",
].join(" ");

export default function InstitutionalLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto w-full max-w-7xl px-6 pt-12 pb-16 md:pt-16 md:pb-24">
      <div className={`max-w-prose ${PROSE}`}>{children}</div>
    </div>
  );
}
