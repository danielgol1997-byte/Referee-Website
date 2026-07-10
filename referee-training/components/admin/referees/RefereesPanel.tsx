"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { flagEmoji } from "@/lib/countries";

type Referee = {
  id: string;
  name: string | null;
  email: string;
  country: string | null;
  isActive: boolean;
  association: { id: string; name: string; countryCode: string | null } | null;
  rank: { id: string; name: string } | null;
  internationalAssociationId: string | null;
  internationalAssociation: { id: string; name: string } | null;
  internationalRank: { id: string; name: string } | null;
};

type Rank = { id: string; name: string; order: number };

type InternationalFederation = {
  id: string;
  name: string;
  ranks: { id: string; name: string; order: number }[];
};

const NONE = "__none__";

/**
 * FA Admin referee management. Lists referees in the admin's association and
 * lets them assign a rank (within the FA) plus an international federation
 * (FIFA, UEFA, ...) and a category inside it.
 */
export function RefereesPanel() {
  const [referees, setReferees] = useState<Referee[]>([]);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [federations, setFederations] = useState<InternationalFederation[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadReferees = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const params = q.trim() ? `?search=${encodeURIComponent(q.trim())}` : "";
      const res = await fetch(`/api/admin/referees${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to load referees");
      setReferees(data.referees ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load referees");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Ranks for the admin's own FA + the international federations catalogue.
    Promise.all([
      fetch("/api/admin/ranks").then((r) => r.json()).catch(() => ({ ranks: [] })),
      fetch("/api/admin/associations?international=true")
        .then((r) => r.json())
        .catch(() => ({ associations: [] })),
    ]).then(([ownRanks, intl]) => {
      setRanks(ownRanks.ranks ?? []);
      setFederations(intl.associations ?? []);
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => loadReferees(search), 200);
    return () => clearTimeout(t);
  }, [search, loadReferees]);

  const rankOptions = useMemo(
    () => [{ value: NONE, label: "Unranked" }, ...ranks.map((r) => ({ value: r.id, label: r.name }))],
    [ranks]
  );
  const federationOptions = useMemo(
    () => [
      { value: NONE, label: "None" },
      ...federations.map((f) => ({ value: f.id, label: `🌍 ${f.name}` })),
    ],
    [federations]
  );
  const categoriesByFederation = useMemo(() => {
    const map = new Map<string, { value: string; label: string }[]>();
    for (const federation of federations) {
      map.set(federation.id, [
        { value: NONE, label: "No category" },
        ...federation.ranks.map((r) => ({ value: r.id, label: r.name })),
      ]);
    }
    return map;
  }, [federations]);

  const updateReferee = async (
    id: string,
    patch: {
      rankId?: string | null;
      internationalAssociationId?: string | null;
      internationalRankId?: string | null;
    }
  ) => {
    setSavingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to update referee");
      setReferees((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                rank: data.user.rank ?? null,
                internationalAssociationId: data.user.internationalAssociationId ?? null,
                internationalAssociation: data.user.internationalAssociation ?? null,
                internationalRank: data.user.internationalRank ?? null,
              }
            : r
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update referee");
      // Reload to reflect the true server state after a failed optimistic edit.
      loadReferees(search);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text-primary">Referees</h2>
        <p className="text-sm text-text-secondary">
          Assign a rank within your federation, and optionally an international federation (FIFA,
          UEFA, ...) with a category inside it.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-status-danger/30 bg-status-danger/10 px-4 py-3 text-sm text-status-danger">
          {error}
        </div>
      )}

      <div className="max-w-sm">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-dark-600 bg-dark-900/60">
        <div className="hidden grid-cols-[1fr_180px_320px] gap-4 border-b border-dark-700 px-4 py-3 text-xs font-medium uppercase tracking-wider text-text-muted md:grid">
          <span>Referee</span>
          <span>Rank</span>
          <span>International federation</span>
        </div>

        {loading ? (
          <div className="px-4 py-10 text-center text-sm text-text-muted">Loading referees…</div>
        ) : referees.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-text-muted">
            No referees in your federation yet.
          </div>
        ) : (
          <div className="divide-y divide-dark-700/70">
            {referees.map((ref) => (
              <div
                key={ref.id}
                className="grid grid-cols-1 gap-3 px-4 py-3 md:grid-cols-[1fr_180px_320px] md:items-center md:gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none">
                      {flagEmoji(ref.association?.countryCode ?? ref.country) || "🏳️"}
                    </span>
                    <span className="truncate font-medium text-text-primary">
                      {ref.name || "Unnamed referee"}
                    </span>
                    {!ref.isActive && (
                      <span className="rounded bg-status-danger/15 px-1.5 py-0.5 text-[10px] font-medium uppercase text-status-danger">
                        Disabled
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-text-muted">{ref.email}</div>
                </div>

                <Select
                  value={ref.rank?.id ?? NONE}
                  options={rankOptions}
                  onChange={(v) =>
                    updateReferee(ref.id, { rankId: v === NONE ? null : String(v) })
                  }
                  className={savingId === ref.id ? "opacity-60 pointer-events-none" : ""}
                />

                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={ref.internationalAssociationId ?? NONE}
                    options={federationOptions}
                    onChange={(v) =>
                      updateReferee(ref.id, {
                        internationalAssociationId: v === NONE ? null : String(v),
                      })
                    }
                    className={savingId === ref.id ? "opacity-60 pointer-events-none" : ""}
                  />
                  {ref.internationalAssociationId ? (
                    <Select
                      value={ref.internationalRank?.id ?? NONE}
                      options={
                        categoriesByFederation.get(ref.internationalAssociationId) ?? [
                          { value: NONE, label: "No category" },
                        ]
                      }
                      onChange={(v) =>
                        updateReferee(ref.id, {
                          internationalRankId: v === NONE ? null : String(v),
                        })
                      }
                      className={savingId === ref.id ? "opacity-60 pointer-events-none" : ""}
                    />
                  ) : (
                    <div className="flex h-11 items-center rounded-lg border border-dashed border-dark-600/60 px-3 text-xs text-text-muted">
                      No category
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
