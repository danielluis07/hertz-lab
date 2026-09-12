/** The public name attached to a Review: first name plus last initial. */
export function reviewAuthorLabel(name: string): string {
  const parts = name.trim().split(/\s+/);
  const firstName = parts[0] ?? "";
  const lastName = parts.at(-1);

  return parts.length === 1 || !lastName
    ? firstName
    : `${firstName} ${lastName[0]}.`;
}
