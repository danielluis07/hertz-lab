type CategoryAddress = { slug: string; parentSlug: string | null };

/** ADR-0022: a root and its children, and nothing beneath them. */
const CATEGORY_TREE_DEPTH = 2;

/**
 * A Category's one public path (ADR-0043): `/produtos/<raiz>` for a root and
 * `/produtos/<raiz>/<filho>` for a child. The tree is two levels deep
 * (ADR-0022), so a parent's slug is the whole of the ancestry a path needs.
 *
 * At the module root because every surface that links a Category must spell
 * it the same way — the Category route validates exactly this chain and 404s
 * any other.
 */
export function categoryPath(category: CategoryAddress): string {
  return `/produtos/${categorySegments(category).join("/")}`;
}

/**
 * The slug a `/produtos/[...categoria]` path asks for — its last segment — or
 * `null` when the path is deeper than the tree, which the route refuses
 * **without a read** (ADR-0022, ADR-0043).
 *
 * Finding the row is not accepting the path: `isCanonicalCategoryPath` decides
 * that once the row is in hand.
 */
export function categorySlugFromPath(segments: string[]): string | null {
  if (segments.length < 1 || segments.length > CATEGORY_TREE_DEPTH) return null;

  return segments[segments.length - 1];
}

/**
 * Whether `segments` spell this Category's one public path (ADR-0043): a
 * root's own slug alone, or a child's parent slug then its own.
 *
 * `category.slug` is globally unique, so the last segment resolves on its
 * own — this is what stops `/produtos/fones` and
 * `/produtos/qualquer-coisa/fones` from being permanent aliases of
 * `/produtos/audio/fones`. Anything it rejects is `notFound()`, never a
 * redirect: a fabricated parent is a URL that never existed.
 */
export function isCanonicalCategoryPath(
  segments: string[],
  category: CategoryAddress,
): boolean {
  const canonical = categorySegments(category);

  return (
    segments.length === canonical.length &&
    segments.every((segment, index) => segment === canonical[index])
  );
}

/**
 * The spelling both functions above share, so the path the store links and
 * the path the route accepts cannot become two answers. Compared as segments
 * rather than as a joined string, so no decoded segment can carry a `/` into
 * a match.
 */
function categorySegments({ slug, parentSlug }: CategoryAddress): string[] {
  return parentSlug === null ? [slug] : [parentSlug, slug];
}
