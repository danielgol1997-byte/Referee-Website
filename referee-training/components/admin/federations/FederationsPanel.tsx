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
  isActive: boolean;
  _count: { members: number; ranks: number };
};

type Rank = {
  id: string;
  name: string;
  order: number;
  associationId: string | null;
  _count: { members: number; internationalMembers: number };
};

const INTERNATIONAL = "__international__";

export function FederationsPanel() {
  const [associations, setAssociations] = useState<Association[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newRank, setNewRank] = useState("");

  const loadAssociations = useCallback(async () => {
    setLoading(true);
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

  const loadRanks = useCallback(async (key: string) => {
    const qs = key === INTERNATIONAL ? "international=true" : `associationId=${key}`;
    const res = await fetch(`/api/admin/ranks?${qs}`);
    const data = await res.json();
    if (res.ok) setRanks(data.ranks ?? []);
  }, []);

  useEffect(() => {
    loadAssociations();
  }, [loadAssociations]);

  useEffect(() => {
    if (selected) loadRanks(selected);
    else setRanks([]);
  }, [selected, loadRanks]);

  const run = async (fn: () => Promise<Response>, onOk: () => void) => {
    setError(null);
    try {
      const res = await fn();
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Something went wrong");
      onOk();
    } catch (err) {
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
          body: JSON.stringify({ name: newName.trim(), countryCode: newCode || null }),
        }),
      () => {
        setNewName("");
        setNewCode("");
        loadAssociations();
      }
    );
  };

  const renameAssociation = async (id: string, name: string) => {
    await run(
      () =>
        fetch(`/api/admin/associations/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        }),
      loadAssociations
    );
  };

  const deleteAssociation = async (id: string) => {
    await run(
      () => fetch(`/api/admin/associations/${id}`, { method: "DELETE" }),
      () => {
        if (selected === id) setSelected(null);
        loadAssociations();
      }
    );
  };

  const addRank = async () => {
    if (!newRank.trim() || !selected) return;
    const associationId = selected === INTERNATIONAL ? null : selected;
    await run(
      () =>
        fetch("/api/admin/ranks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newRank.trim(), associationId }),
        }),
      () => {
        setNewRank("");
        loadRanks(selected);
        loadAssociations();
      }
    );
  };

  const renameRank = async (id: string, name: string) => {
    await run(
      () =>
        fetch(`/api/admin/ranks/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        }),
      () => selected && loadRanks(selected)
    );
  };

  const moveRank = async (id: string, direction: "up" | "down") => {
    await run(
      () =>
        fetch(`/api/admin/ranks/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ direction }),
        }),
      () => selected && loadRanks(selected)
    );
  };

  const deleteRank = async (id: string) => {
    await run(
      () => fetch(`/api/admin/ranks/${id}`, { method: "DELETE" }),
      () => {
        if (selected) loadRanks(selected);
        loadAssociations();
      }
    );
  };

  const selectedLabel =
    selected === INTERNATIONAL
      ? "International panels"
      : associations.find((a) => a.id === selected)?.name ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text-primary">Federations</h2>
        <p className="text-sm text-text-secondary">
          Build the hierarchy: create associations and define the ranks inside each one. Admins assign
          referees to these ranks.
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
            Associations {loading ? "" : `(${associations.length})`}
          </div>
          <div className="divide-y divide-dark-700/70">
            {associations.map((a) => (
              <FederationRow
                key={a.id}
                association={a}
                active={selected === a.id}
                onSelect={() => setSelected(a.id)}
                onRename={(name) => renameAssociation(a.id, name)}
                onDelete={() => deleteAssociation(a.id)}
              />
            ))}

            {/* International panels pseudo-entry */}
            <button
              type="button"
              onClick={() => setSelected(INTERNATIONAL)}
              className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors ${
                selected === INTERNATIONAL ? "bg-accent/10" : "hover:bg-dark-800/60"
              }`}
            >
              <span className="flex items-center gap-2 font-medium text-text-primary">
                <span className="text-base">🌍</span> International panels
              </span>
              <span className="text-xs text-text-muted">UEFA, FIFA, ...</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-dark-700 p-3">
            <div className="w-32">
              <CountryPicker value={newCode} onChange={setNewCode} placeholder="Flag" />
            </div>
            <div className="min-w-[140px] flex-1">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="New association name"
                onKeyDown={(e) => e.key === "Enter" && addAssociation()}
              />
            </div>
            <Button onClick={addAssociation} disabled={!newName.trim()}>
              Add
            </Button>
          </div>
        </div>

        {/* Ranks column */}
        <div className="rounded-xl border border-dark-600 bg-dark-900/60">
          <div className="border-b border-dark-700 px-4 py-3 text-sm font-medium text-text-primary">
            {selected ? `Ranks — ${selectedLabel}` : "Ranks"}
          </div>

          {!selected ? (
            <div className="px-4 py-10 text-center text-sm text-text-muted">
              Select an association to manage its ranks.
            </div>
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
                    No ranks yet. Add the highest rank first.
                  </div>
                )}
              </div>

              <div className="flex gap-2 border-t border-dark-700 p-3">
                <div className="flex-1">
                  <Input
                    value={newRank}
                    onChange={(e) => setNewRank(e.target.value)}
                    placeholder={selected === INTERNATIONAL ? "New panel (e.g. UEFA)" : "New rank name"}
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
            <span className="text-base leading-none">{flagEmoji(association.countryCode) || "🏳️"}</span>
            <span className="font-medium text-text-primary">{association.name}</span>
            <span className="text-xs text-text-muted">
              {association._count.members} referee{association._count.members === 1 ? "" : "s"}
            </span>
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
