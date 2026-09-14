/**
 * The Category ids a Category page's catalogue narrows to (ADR-0043): the
 * Category and its children.
 *
 * **One expression for both levels, and deliberately no branch.** A root page
 * shows its whole subtree; a child has no children (ADR-0022), so the same
 * expression yields `[id]` for it. Two branches would be free to drift apart.
 *
 * **Sorted**, because the array varies the query key: two orderings of one
 * subtree would otherwise cache as two entries holding identical rows. A copy
 * is sorted, never the caller's array.
 */
export function categorySubtreeIds(category: {
  id: string;
  children: { id: string }[];
}): string[] {
  return [category.id, ...category.children.map((child) => child.id)].sort();
}
