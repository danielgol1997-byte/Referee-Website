/**
 * Federation content scoping.
 *
 * Content rows carry a nullable `associationId`:
 *   - null            => global content, visible to everyone
 *   - <associationId> => visible only to members/admins of that association
 *
 * A user sees global content plus their own association's content.
 */

/** Prisma `where` fragment limiting content to what a user may see. */
export function contentWhere(associationId: string | null | undefined) {
  if (!associationId) {
    // No association yet (e.g. brand-new referee, super admin without an FA):
    // only global content.
    return { associationId: null };
  }
  return { OR: [{ associationId: null }, { associationId }] };
}

/**
 * Same as {@link contentWhere} but for callers that see everything.
 * Super admins are unscoped; everyone else is scoped to their association.
 */
export function scopedContentWhere(opts: {
  associationId: string | null | undefined;
  unscoped: boolean;
}) {
  if (opts.unscoped) return {};
  return contentWhere(opts.associationId);
}
