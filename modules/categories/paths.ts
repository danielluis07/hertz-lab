/**
 * A Category's one public path (ADR-0043): `/produtos/<raiz>` for a root and
 * `/produtos/<raiz>/<filho>` for a child. The tree is two levels deep
 * (ADR-0022), so a parent's slug is the whole of the ancestry a path needs.
 *
 * At the module root because every surface that links a Category must spell
 * it the same way — the Category route validates exactly this chain and 404s
 * any other.
 */
export function categoryPath({
  slug,
  parentSlug,
}: {
  slug: string;
  parentSlug: string | null;
}): string {
  return parentSlug === null
    ? `/produtos/${slug}`
    : `/produtos/${parentSlug}/${slug}`;
}
