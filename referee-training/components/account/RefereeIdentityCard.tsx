import { flagEmoji } from "@/lib/countries";

type Props = {
  associationName: string | null;
  associationCountryCode: string | null;
  rankName: string | null;
  internationalName: string | null;
  internationalCategoryName: string | null;
};

/**
 * Read-only summary of the referee's place in the football hierarchy:
 * national association + rank, and (if assigned) international federation
 * + category. Assignments are managed by admins.
 */
export function RefereeIdentityCard({
  associationName,
  associationCountryCode,
  rankName,
  internationalName,
  internationalCategoryName,
}: Props) {
  if (!associationName && !internationalName) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {associationName && (
        <div className="relative overflow-hidden rounded-xl border border-dark-600 bg-gradient-to-br from-dark-800 to-dark-900 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Football association
          </div>
          <div className="mt-2 flex items-center gap-2.5">
            <span className="text-2xl leading-none">{flagEmoji(associationCountryCode) || "🏳️"}</span>
            <div className="min-w-0">
              <div className="truncate font-semibold text-text-primary">{associationName}</div>
              {rankName ? (
                <span className="mt-1 inline-flex items-center rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
                  {rankName}
                </span>
              ) : (
                <span className="mt-1 inline-block text-xs text-text-muted">Unranked</span>
              )}
            </div>
          </div>
        </div>
      )}

      {internationalName && (
        <div className="relative overflow-hidden rounded-xl border border-accent/25 bg-gradient-to-br from-accent/10 to-dark-900 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-accent/80">
            International federation
          </div>
          <div className="mt-2 flex items-center gap-2.5">
            <span className="text-2xl leading-none">🌍</span>
            <div className="min-w-0">
              <div className="truncate font-semibold text-text-primary">{internationalName}</div>
              {internationalCategoryName ? (
                <span className="mt-1 inline-flex items-center rounded-full bg-accent/20 px-2 py-0.5 text-xs font-medium text-accent">
                  {internationalCategoryName}
                </span>
              ) : (
                <span className="mt-1 inline-block text-xs text-text-muted">No category yet</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
