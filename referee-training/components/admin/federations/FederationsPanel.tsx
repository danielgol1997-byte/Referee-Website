"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CountryPicker } from "@/components/ui/CountryPicker";
import { flagEmoji } from "@/lib/countries";

type Association = {
  id: string;
  name: string;
  countryCode: string | null;
  isInternational: boolean;
  isActive: boolean;
  _count: { members: number; internationalMembers: number; ranks: number };
};

type Rank = {
  id: string;
  name: string;
  order: number;
  associationId: string | null;
  _count: { members: number; internationalMembers: number };
};

/** Lets other mounted panels (e.g. Users) refresh their FA/rank dropdowns. */
function notifyHierarchyChanged() {
  window.dispatchEvent(new Event("fa-hierarchy-changed"));
}

function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="divide-y divide-dark-700/70">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5">
          <div
            className="h-4 w-5 animate-pulse rounded bg-dark-700/70"
            style={{ animationDelay: `${i * 100}ms` }}
          />
          <div
            className="h-4 flex-1 animate-pulse rounded bg-dark-700/60"
            style={{ animationDelay: `${i * 100 + 50}ms` }}
          />
          <div
            className="h-4 w-16 animate-pulse rounded bg-dark-700/40"
            style={{ animationDelay: `${i * 100 + 100}ms` }}
          />
        </div>
      ))}
    </div>
  );
}

export function FederationsPanel() {
  const [associations, setAssociations] = useState<Association[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [ranksLoading, setRanksLoading] = useState(false);

  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newIsInternational, setNewIsInternational] = useState(false);
  const [newRank, setNewRank] = useState("");

  const loadAssociations = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/associations");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to load federations");
      setAssociations(data.associations ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load federations");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRanks = useCallback(async (key: string, { silent = false } = {}) => {
    if (!silent) setRanksLoading(true);
    try {
      const res = await fetch(`/api/admin/ranks?associationId=${key}`);
      const data = await res.json();
      if (res.ok) setRanks(data.ranks ?? []);
    } finally {
      if (!silent) setRanksLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAssociations();
  }, [loadAssociations]);

  useEffect(() => {
    if (selected) loadRanks(selected);
    else setRanks([]);
  }, [selected, loadRanks]);

  const run = async (fn: () => Promise<Response>, onOk: () => void, onFail?: () => void) => {
    setError(null);
    try {
      const res = await fn();
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Something went wrong");
      onOk();
      notifyHierarchyChanged();
    } catch (err) {
      onFail?.();
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const addAssociation = async () => {
    if (!newName.trim()) return;
    await run(
      () =>
        fetch("/api/admin/associations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newName.trim(),
            countryCode: newIsInternational ? null : newCode || null,
            isInternational: newIsInternational,
          }),
        }),
      () => {
        setNewName("");
        setNewCode("");
        setNewIsInternational(false);
        loadAssociations();
      }
    );
  };

  const renameAssociation = async (id: string, name: string) => {
    // Optimistic: rename locally, reconcile in the background.
    const prev = associations;
    setAssociations((list) => list.map((a) => (a.id === id ? { ...a, name } : a)));
    await run(
      () =>
        fetch(`/api/admin/associations/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        }),
      () => {},
      () => setAssociations(prev)
    );
  };

  const deleteAssociation = async (id: string) => {
    const prev = associations;
    setAssociations((list) => list.filter((a) => a.id !== id));
    if (selected === id) setSelected(null);
    await run(
      () => fetch(`/api/admin/associations/${id}`, { method: "DELETE" }),
      () => {},
      () => setAssociations(prev)
    );
  };

  const addRank = async () => {
    if (!newRank.trim() || !selected) return;
    const associationId = selected;
    await run(
      () =>
        fetch("/api/admin/ranks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newRank.trim(), associationId }),
        }),
      () => {
        setNewRank("");
        loadRanks(selected, { silent: true });
        loadAssociations();
      }
    );
  };

  const renameRank = async (id: string, name: string) => {
    const prev = ranks;
    setRanks((list) => list.map((r) => (r.id === id ? { ...r, name } : r)));
    await run(
      () =>
        fetch(`/api/admin/ranks/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        }),
      () => {},
      () => setRanks(prev)
    );
  };

  const moveRank = async (id: string, direction: "up" | "down") => {
    // Optimistic swap so reordering feels instant.
    const prev = ranks;
    const index = ranks.findIndex((r) => r.id === id);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= ranks.length) return;
    const next = [...ranks];
    [next[index], next[target]] = [next[target], next[index]];
    setRanks(next);
    await run(
      () =>
        fetch(`/api/admin/ranks/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ direction }),
        }),
      () => {
        if (selected) loadRanks(selected, { silent: true });
      },
      () => setRanks(prev)
    );
  };

  const deleteRank = async (id: string) => {
    const prev = ranks;
    setRanks((list) => list.filter((r) => r.id !== id));
    await run(
      () => fetch(`/api/admin/ranks/${id}`, { method: "DELETE" }),
      () => loadAssociations(),
      () => setRanks(prev)
    );
  };

  const selectedAssociation = associations.find((a) => a.id === selected) ?? null;
  const selectedLabel = selectedAssociation?.name ?? "";
  const selectedIsInternational = selectedAssociation?.isInternational ?? false;
  const nationals = associations.filter((a) => !a.isInternational);
  const internationals = associations.filter((a) => a.isInternational);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text-primary">Federations</h2>
        <p className="text-sm text-text-secondary">
          Build the hierarchy: create national associations and international federations (FIFA, UEFA,
          ...), then define the ranks or categories inside each one. Referees belong to one association
          and can additionally be assigned to one international federation.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-status-danger/30 bg-status-danger/10 px-4 py-3 text-sm text-status-danger">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Associations column */}
        <div className="rounded-xl border border-dark-600 bg-dark-900/60">
          <div className="border-b border-dark-700 px-4 py-3 text-sm font-medium text-text-primary">
            Federations {loading ? "" : `(${associations.length})`}
          </div>
          {loading ? (
            <ListSkeleton />
          ) : (
            <>
              <div className="bg-dark-800/40 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                National associations
              </div>
              <div className="divide-y divide-dark-700/70">
                {nationals.map((a) => (
                  <FederationRow
                    key={a.id}
                    association={a}
                    active={selected === a.id}
                    onSelect={() => setSelected(a.id)}
                    onRename={(name) => renameAssociation(a.id, name)}
                    onDelete={() => deleteAssociation(a.id)}
                  />
                ))}
                {nationals.length === 0 && (
                  <div className="px-4 py-4 text-center text-xs text-text-muted">
                    No national associations yet.
                  </div>
                )}
              </div>

              <div className="border-t border-dark-700 bg-dark-800/40 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                International federations
              </div>
              <div className="divide-y divide-dark-700/70">
                {internationals.map((a) => (
                  <FederationRow
                    key={a.id}
                    association={a}
                    active={selected === a.id}
                    onSelect={() => setSelected(a.id)}
                    onRename={(name) => renameAssociation(a.id, name)}
                    onDelete={() => deleteAssociation(a.id)}
                  />
                ))}
                {internationals.length === 0 && (
                  <div className="px-4 py-4 text-center text-xs text-text-muted">
                    No international federations yet. Toggle &ldquo;International&rdquo; below to add one.
                  </div>
                )}
              </div>
            </>
          )}

          <div className="space-y-2 border-t border-dark-700 p-3">
            <div className="flex flex-wrap gap-2">
              {!newIsInternational && (
                <div className="w-32">
                  <CountryPicker value={newCode} onChange={setNewCode} placeholder="Flag" />
                </div>
              )}
              <div className="min-w-[140px] flex-1">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={newIsInternational ? "New federation (e.g. UEFA)" : "New association name"}
                  onKeyDown={(e) => e.key === "Enter" && addAssociation()}
                />
              </div>
              <Button onClick={addAssociation} disabled={!newName.trim()}>
                Add
              </Button>
            </div>
            <label className="flex w-fit cursor-pointer items-center gap-2 text-xs text-text-secondary">
              <button
                type="button"
                role="switch"
                aria-checked={newIsInternational}
                onClick={() => setNewIsInternational((v) => !v)}
                className={`relative h-5 w-9 rounded-full transition-colors ${
                  newIsInternational ? "bg-accent" : "bg-dark-600"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                    newIsInternational ? "left-[18px]" : "left-0.5"
                  }`}
                />
              </button>
              <span>
                🌍 International federation
                <span className="ml-1 text-text-muted">— assignable in addition to a referee&rsquo;s FA</span>
              </span>
            </label>
          </div>
        </div>

        {/* Ranks column */}
        <div className="rounded-xl border border-dark-600 bg-dark-900/60">
          <div className="border-b border-dark-700 px-4 py-3 text-sm font-medium text-text-primary">
            {selected
              ? `${selectedIsInternational ? "Categories" : "Ranks"} — ${selectedLabel}`
              : "Ranks / Categories"}
          </div>

          {!selected ? (
            <div className="px-4 py-10 text-center text-sm text-text-muted">
              Select a federation to manage its ranks or categories.
            </div>
          ) : ranksLoading ? (
            <ListSkeleton />
          ) : (
            <>
              <div className="divide-y divide-dark-700/70">
                {ranks.map((r, index) => (
                  <RankRow
                    key={r.id}
                    rank={r}
                    isFirst={index === 0}
                    isLast={index === ranks.length - 1}
                    onRename={(name) => renameRank(r.id, name)}
                    onMove={(dir) => moveRank(r.id, dir)}
                    onDelete={() => deleteRank(r.id)}
                  />
                ))}
                {ranks.length === 0 && (
                  <div className="px-4 py-10 text-center text-sm text-text-muted">
                    {selectedIsInternational
                      ? "No categories yet. Add the highest category first (e.g. Elite)."
                      : "No ranks yet. Add the highest rank first."}
                  </div>
                )}
              </div>

              <div className="flex gap-2 border-t border-dark-700 p-3">
                <div className="flex-1">
                  <Input
                    value={newRank}
                    onChange={(e) => setNewRank(e.target.value)}
                    placeholder={
                      selectedIsInternational ? "New category (e.g. Elite)" : "New rank name"
                    }
                    onKeyDown={(e) => e.key === "Enter" && addRank()}
                  />
                </div>
                <Button onClick={addRank} disabled={!newRank.trim()}>
                  Add
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FederationRow({
  association,
  active,
  onSelect,
  onRename,
  onDelete,
}: {
  association: Association;
  active: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(association.name);

  return (
    <div className={`flex items-center gap-2 px-4 py-3 text-sm ${active ? "bg-accent/10" : "hover:bg-dark-800/60"}`}>
      {editing ? (
        <>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 flex-1" />
          <Button
            size="xs"
            onClick={() => {
              onRename(name.trim());
              setEditing(false);
            }}
          >
            Save
          </Button>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => {
              setName(association.name);
              setEditing(false);
            }}
          >
            Cancel
          </Button>
        </>
      ) : (
        <>
          <button type="button" onClick={onSelect} className="flex flex-1 items-center gap-2 text-left">
            <span className="text-base leading-none">
              {association.isInternational ? "🌍" : flagEmoji(association.countryCode) || "🏳️"}
            </span>
            <span className="font-medium text-text-primary">{association.name}</span>
            {(() => {
              const count = association.isInternational
                ? association._count.internationalMembers
                : association._count.members;
              return (
                <span className="text-xs text-text-muted">
                  {count} referee{count === 1 ? "" : "s"}
                </span>
              );
            })()}
          </button>
          <Button size="xs" variant="ghost" onClick={() => setEditing(true)}>
            Rename
          </Button>
          <Button size="xs" variant="danger" onClick={onDelete}>
            Delete
          </Button>
        </>
      )}
    </div>
  );
}

function RankRow({
  rank,
  isFirst,
  isLast,
  onRename,
  onMove,
  onDelete,
}: {
  rank: Rank;
  isFirst: boolean;
  isLast: boolean;
  onRename: (name: string) => void;
  onMove: (direction: "up" | "down") => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(rank.name);
  const holders = rank._count.members + rank._count.internationalMembers;

  return (
    <div className="flex items-center gap-2 px-4 py-3 text-sm">
      <div className="flex flex-col">
        <button
          type="button"
          onClick={() => onMove("up")}
          disabled={isFirst}
          className="text-text-muted hover:text-accent disabled:opacity-20"
          aria-label="Move up"
        >
          ▲
        </button>
        <button
          type="button"
          onClick={() => onMove("down")}
          disabled={isLast}
          className="text-text-muted hover:text-accent disabled:opacity-20"
          aria-label="Move down"
        >
          ▼
        </button>
      </div>

      {editing ? (
        <>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 flex-1" />
          <Button
            size="xs"
            onClick={() => {
              onRename(name.trim());
              setEditing(false);
            }}
          >
            Save
          </Button>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => {
              setName(rank.name);
              setEditing(false);
            }}
          >
            Cancel
          </Button>
        </>
      ) : (
        <>
          <span className="flex-1 font-medium text-text-primary">{rank.name}</span>
          <span className="text-xs text-text-muted">
            {holders} referee{holders === 1 ? "" : "s"}
          </span>
          <Button size="xs" variant="ghost" onClick={() => setEditing(true)}>
            Rename
          </Button>
          <Button size="xs" variant="danger" onClick={onDelete}>
            Delete
          </Button>
        </>
      )}
    </div>
  );
}
