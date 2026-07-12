"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CountryPicker } from "@/components/ui/CountryPicker";
import { flagEmoji } from "@/lib/countries";
import { cn } from "@/lib/utils";

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

type SubTab = "federations" | "ranks";

/** Lets other mounted panels (e.g. Users) refresh their FA/rank dropdowns. */
function notifyHierarchyChanged() {
  window.dispatchEvent(new Event("fa-hierarchy-changed"));
}

function Icon({ path, className }: { path: string; className?: string }) {
  return (
    <svg className={cn("h-4 w-4", className)} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
    </svg>
  );
}

const ICONS = {
  search: "M21 21l-4.3-4.3m1.8-5.2a7 7 0 11-14 0 7 7 0 0114 0z",
  plus: "M12 5v14M5 12h14",
  pencil: "M16.862 4.487a2.25 2.25 0 113.182 3.182L7.5 20.213l-4 1 1-4L16.862 4.487z",
  trash: "M6 7h12M9 7V4.8c0-.44.36-.8.8-.8h4.4c.44 0 .8.36.8.8V7m-8 0 1 13.2A2 2 0 0010 22h4a2 2 0 002-1.8L17 7",
  chevronUp: "M5 15l7-7 7 7",
  chevronDown: "M19 9l-7 7-7-7",
  check: "M5 13l4 4L19 7",
  x: "M6 18L18 6M6 6l12 12",
  users:
    "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  arrow: "M9 5l7 7-7 7",
};

function IconButton({
  icon,
  label,
  onClick,
  tone = "ghost",
  disabled = false,
}: {
  icon: keyof typeof ICONS;
  label: string;
  onClick: () => void;
  tone?: "ghost" | "danger";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors disabled:pointer-events-none disabled:opacity-20",
        tone === "danger"
          ? "text-text-muted hover:bg-red-900/30 hover:text-red-400"
          : "text-text-muted hover:bg-accent/10 hover:text-accent"
      )}
    >
      <Icon path={ICONS[icon]} />
    </button>
  );
}

function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="divide-y divide-dark-700/70">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5">
          <div
            className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-dark-700/70"
            style={{ animationDelay: `${i * 100}ms` }}
          />
          <div className="flex-1 space-y-1.5">
            <div
              className="h-3.5 w-2/3 animate-pulse rounded bg-dark-700/60"
              style={{ animationDelay: `${i * 100 + 50}ms` }}
            />
            <div
              className="h-3 w-1/3 animate-pulse rounded bg-dark-700/40"
              style={{ animationDelay: `${i * 100 + 100}ms` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FederationsPanel() {
  const [subTab, setSubTab] = useState<SubTab>("federations");
  const [associations, setAssociations] = useState<Association[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [ranksLoading, setRanksLoading] = useState(false);

  const [faSearch, setFaSearch] = useState("");
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

  const openRanksFor = (id: string) => {
    setSelected(id);
    setSubTab("ranks");
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

  const search = faSearch.trim().toLowerCase();
  const filteredNationals = search ? nationals.filter((a) => a.name.toLowerCase().includes(search)) : nationals;
  const filteredInternationals = search
    ? internationals.filter((a) => a.name.toLowerCase().includes(search))
    : internationals;

  const ranksTabLabel = selectedAssociation
    ? `${selectedIsInternational ? "Categories" : "Ranks"} · ${selectedLabel}`
    : "Ranks & categories";

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-text-primary">Federations</h2>
        <p className="mt-1 max-w-2xl text-sm text-text-secondary">
          Two simple jobs: add the FAs and confederations that exist in the world, then define the ranks
          or categories inside each one.
        </p>
      </div>

      {/* Sub-tabs — big, unmistakable */}
      <div
        role="tablist"
        aria-label="Federation tools"
        className="grid grid-cols-2 gap-2 rounded-2xl border border-dark-600 bg-dark-900/70 p-1.5"
      >
        <button
          type="button"
          role="tab"
          aria-selected={subTab === "federations"}
          onClick={() => setSubTab("federations")}
          className={cn(
            "flex flex-col items-start gap-0.5 rounded-xl px-4 py-3 text-left transition-all",
            subTab === "federations"
              ? "bg-accent text-dark-900 shadow-glow"
              : "text-text-secondary hover:bg-dark-800/80 hover:text-white"
          )}
        >
          <span className="text-sm font-semibold">1. Add federations</span>
          <span
            className={cn(
              "text-[11px] leading-snug",
              subTab === "federations" ? "text-dark-900/70" : "text-text-muted"
            )}
          >
            National FAs &amp; international confederations
          </span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={subTab === "ranks"}
          onClick={() => setSubTab("ranks")}
          className={cn(
            "flex flex-col items-start gap-0.5 rounded-xl px-4 py-3 text-left transition-all",
            subTab === "ranks"
              ? "bg-accent text-dark-900 shadow-glow"
              : "text-text-secondary hover:bg-dark-800/80 hover:text-white"
          )}
        >
          <span className="text-sm font-semibold">2. Ranks &amp; categories</span>
          <span
            className={cn(
              "truncate text-[11px] leading-snug",
              subTab === "ranks" ? "text-dark-900/70" : "text-text-muted"
            )}
          >
            {selectedAssociation
              ? `Editing ${selectedLabel}`
              : "Pick a federation, then build its ladder"}
          </span>
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-status-danger/30 bg-status-danger/10 px-4 py-3 text-sm text-status-danger">
          <Icon path="M12 9v3.75m0 3.75h.008M21 12a9 9 0 11-18 0 9 9 0 0118 0z" className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ─── TAB 1: Add & manage federations ─── */}
      {subTab === "federations" && (
        <div className="space-y-4" role="tabpanel">
          {/* Always-visible create form */}
          <div className="overflow-hidden rounded-2xl border border-accent/25 bg-gradient-to-br from-accent/10 via-dark-900/80 to-dark-900/60 shadow-card">
            <div className="border-b border-accent/15 px-5 py-3.5">
              <div className="text-sm font-semibold text-text-primary">Add a federation</div>
              <p className="mt-0.5 text-xs text-text-muted">
                National FAs (one per country) or international confederations like FIFA and UEFA.
              </p>
            </div>
            <div className="space-y-3 p-5">
              <div
                role="radiogroup"
                aria-label="Federation type"
                className="grid grid-cols-2 gap-2"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={!newIsInternational}
                  onClick={() => setNewIsInternational(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all",
                    !newIsInternational
                      ? "border-accent bg-accent/15 ring-1 ring-accent/40"
                      : "border-dark-600 bg-dark-900/40 hover:border-dark-500"
                  )}
                >
                  <span className="text-xl leading-none">🏳️</span>
                  <span>
                    <span className="block text-sm font-semibold text-text-primary">National</span>
                    <span className="block text-[11px] text-text-muted">Country FA · e.g. FA England</span>
                  </span>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={newIsInternational}
                  onClick={() => setNewIsInternational(true)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all",
                    newIsInternational
                      ? "border-accent bg-accent/15 ring-1 ring-accent/40"
                      : "border-dark-600 bg-dark-900/40 hover:border-dark-500"
                  )}
                >
                  <span className="text-xl leading-none">🌍</span>
                  <span>
                    <span className="block text-sm font-semibold text-text-primary">International</span>
                    <span className="block text-[11px] text-text-muted">Confederation · e.g. UEFA</span>
                  </span>
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {!newIsInternational && (
                  <div className="w-40">
                    <CountryPicker value={newCode} onChange={setNewCode} placeholder="Country flag" />
                  </div>
                )}
                <div className="min-w-[180px] flex-1">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={
                      newIsInternational ? "New federation (e.g. UEFA)" : "New association name"
                    }
                    onKeyDown={(e) => e.key === "Enter" && addAssociation()}
                  />
                </div>
                <Button onClick={addAssociation} disabled={!newName.trim()} size="md">
                  <Icon path={ICONS.plus} className="h-4 w-4" />
                  Add
                </Button>
              </div>
            </div>
          </div>

          {/* Existing list */}
          <div className="overflow-hidden rounded-2xl border border-dark-600 bg-dark-900/60 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-dark-700 px-4 py-3">
              <div className="text-sm font-medium text-text-primary">
                Existing federations {loading ? "" : `(${associations.length})`}
              </div>
              {!loading && associations.length > 4 && (
                <div className="relative w-full max-w-xs sm:w-56">
                  <Icon
                    path={ICONS.search}
                    className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted"
                  />
                  <input
                    value={faSearch}
                    onChange={(e) => setFaSearch(e.target.value)}
                    placeholder="Search..."
                    className="w-full rounded-lg border border-dark-600 bg-dark-800/60 py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-text-muted focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/20"
                  />
                </div>
              )}
            </div>

            {loading ? (
              <ListSkeleton />
            ) : (
              <>
                <SectionLabel>
                  National associations
                  <span className="ml-auto font-normal normal-case tracking-normal text-text-muted">
                    {nationals.length}
                  </span>
                </SectionLabel>
                <div className="divide-y divide-dark-700/60">
                  {filteredNationals.map((a) => (
                    <FederationCard
                      key={a.id}
                      association={a}
                      onManageRanks={() => openRanksFor(a.id)}
                      onRename={(name) => renameAssociation(a.id, name)}
                      onDelete={() => deleteAssociation(a.id)}
                    />
                  ))}
                  {filteredNationals.length === 0 && (
                    <EmptyRow>
                      {search ? "No national associations match your search." : "No national associations yet — add one above."}
                    </EmptyRow>
                  )}
                </div>

                <SectionLabel accent>
                  International federations
                  <span className="ml-auto font-normal normal-case tracking-normal opacity-80">
                    {internationals.length}
                  </span>
                </SectionLabel>
                <div className="divide-y divide-dark-700/60">
                  {filteredInternationals.map((a) => (
                    <FederationCard
                      key={a.id}
                      association={a}
                      onManageRanks={() => openRanksFor(a.id)}
                      onRename={(name) => renameAssociation(a.id, name)}
                      onDelete={() => deleteAssociation(a.id)}
                    />
                  ))}
                  {filteredInternationals.length === 0 && (
                    <EmptyRow>
                      {search
                        ? "No international federations match your search."
                        : "No international federations yet — choose International above to add one."}
                    </EmptyRow>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 2: Ranks & categories ─── */}
      {subTab === "ranks" && (
        <div className="space-y-4" role="tabpanel">
          {/* Federation picker */}
          <div className="overflow-hidden rounded-2xl border border-dark-600 bg-dark-900/60 shadow-card">
            <div className="border-b border-dark-700 px-5 py-3.5">
              <div className="text-sm font-semibold text-text-primary">Which federation?</div>
              <p className="mt-0.5 text-xs text-text-muted">
                Choose the FA or confederation whose ladder you want to edit.
              </p>
            </div>
            <div className="p-4">
              {loading ? (
                <ListSkeleton rows={2} />
              ) : associations.length === 0 ? (
                <div className="rounded-xl border border-dashed border-dark-600 px-4 py-8 text-center">
                  <p className="text-sm text-text-muted">No federations yet.</p>
                  <button
                    type="button"
                    onClick={() => setSubTab("federations")}
                    className="mt-2 text-sm font-medium text-accent hover:underline"
                  >
                    Go add one first →
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <PickerGroup
                    title="National"
                    items={nationals}
                    selectedId={selected}
                    onSelect={setSelected}
                  />
                  <PickerGroup
                    title="International"
                    items={internationals}
                    selectedId={selected}
                    onSelect={setSelected}
                    accent
                  />
                </div>
              )}
            </div>
          </div>

          {/* Ladder editor */}
          <div className="overflow-hidden rounded-2xl border border-dark-600 bg-dark-900/60 shadow-card">
            <div className="flex items-center gap-3 border-b border-dark-700 px-4 py-3">
              {selectedAssociation ? (
                <>
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base leading-none ring-1",
                      selectedIsInternational
                        ? "bg-gradient-to-br from-accent/25 to-accent/5 ring-accent/30"
                        : "bg-dark-700 ring-dark-500"
                    )}
                  >
                    {selectedIsInternational ? "🌍" : flagEmoji(selectedAssociation.countryCode) || "🏳️"}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-text-primary">{ranksTabLabel}</div>
                    <div className="text-xs text-text-muted">
                      {ranks.length}{" "}
                      {selectedIsInternational
                        ? ranks.length === 1
                          ? "category"
                          : "categories"
                        : ranks.length === 1
                          ? "rank"
                          : "ranks"}
                      , highest first
                    </div>
                  </div>
                </>
              ) : (
                <span className="text-sm font-medium text-text-primary">Ranks &amp; categories</span>
              )}
            </div>

            {!selected ? (
              <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-dark-800 text-2xl">
                  🏆
                </span>
                <p className="text-sm text-text-muted">
                  Pick a federation above to manage its ranks or categories.
                </p>
              </div>
            ) : ranksLoading ? (
              <ListSkeleton />
            ) : (
              <>
                <div className="relative">
                  {ranks.length > 1 && (
                    <div className="pointer-events-none absolute bottom-8 left-[34px] top-8 w-px bg-gradient-to-b from-accent/50 via-dark-600 to-dark-600/20" />
                  )}
                  <div className="divide-y divide-dark-700/40">
                    {ranks.map((r, index) => (
                      <RankItem
                        key={r.id}
                        rank={r}
                        position={index}
                        isFirst={index === 0}
                        isLast={index === ranks.length - 1}
                        onRename={(name) => renameRank(r.id, name)}
                        onMove={(dir) => moveRank(r.id, dir)}
                        onDelete={() => deleteRank(r.id)}
                      />
                    ))}
                  </div>
                </div>
                {ranks.length === 0 && (
                  <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-dark-800 text-lg">
                      {selectedIsInternational ? "🥇" : "🎖️"}
                    </span>
                    <p className="text-sm text-text-muted">
                      {selectedIsInternational
                        ? "No categories yet. Add the highest category first (e.g. Elite)."
                        : "No ranks yet. Add the highest rank first."}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 border-t border-dark-700 bg-dark-800/30 p-3">
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
                    <Icon path={ICONS.plus} className="h-4 w-4" />
                    Add
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionLabel({
  children,
  accent = false,
}: {
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 border-t border-dark-700 bg-dark-800/40 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider first:border-t-0",
        accent ? "text-accent/80" : "text-text-muted"
      )}
    >
      {children}
    </div>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-4 text-center text-xs text-text-muted">{children}</div>;
}

function FederationCard({
  association,
  onManageRanks,
  onRename,
  onDelete,
}: {
  association: Association;
  onManageRanks: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(association.name);
  const count = association.isInternational
    ? association._count.internationalMembers
    : association._count.members;

  return (
    <div data-testid="fa-row" className="flex items-center gap-2 px-3.5 py-3 text-sm hover:bg-dark-800/40">
      {editing ? (
        <>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-9 flex-1"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onRename(name.trim());
                setEditing(false);
              }
            }}
          />
          <IconButton
            icon="check"
            label="Save"
            onClick={() => {
              onRename(name.trim());
              setEditing(false);
            }}
          />
          <IconButton
            icon="x"
            label="Cancel"
            onClick={() => {
              setName(association.name);
              setEditing(false);
            }}
          />
        </>
      ) : (
        <>
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm leading-none ring-1",
                association.isInternational
                  ? "bg-gradient-to-br from-accent/25 to-accent/5 ring-accent/30"
                  : "bg-dark-700 ring-dark-500"
              )}
            >
              {association.isInternational ? "🌍" : flagEmoji(association.countryCode) || "🏳️"}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-text-primary">{association.name}</span>
              <span className="block text-[11px] text-text-muted">
                {association._count.ranks}{" "}
                {association.isInternational
                  ? association._count.ranks === 1
                    ? "category"
                    : "categories"
                  : association._count.ranks === 1
                    ? "rank"
                    : "ranks"}
                {" · "}
                {count} referee{count === 1 ? "" : "s"}
              </span>
            </span>
          </div>
          <Button size="xs" variant="secondary" onClick={onManageRanks}>
            {association.isInternational ? "Categories" : "Ranks"}
            <Icon path={ICONS.arrow} className="h-3.5 w-3.5" />
          </Button>
          <IconButton icon="pencil" label="Rename" onClick={() => setEditing(true)} />
          <IconButton icon="trash" label="Delete" tone="danger" onClick={onDelete} />
        </>
      )}
    </div>
  );
}

function PickerGroup({
  title,
  items,
  selectedId,
  onSelect,
  accent = false,
}: {
  title: string;
  items: Association[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  accent?: boolean;
}) {
  return (
    <div>
      <div
        className={cn(
          "mb-2 text-[11px] font-semibold uppercase tracking-wider",
          accent ? "text-accent/80" : "text-text-muted"
        )}
      >
        {title}
      </div>
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-dark-600 px-3 py-4 text-center text-xs text-text-muted">
          None yet
        </div>
      ) : (
        <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
          {items.map((a) => {
            const active = selectedId === a.id;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => onSelect(a.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition-all",
                  active
                    ? "border-accent bg-accent/15 ring-1 ring-accent/30"
                    : "border-transparent bg-dark-800/40 hover:border-dark-600 hover:bg-dark-800"
                )}
              >
                <span className="text-base leading-none">
                  {a.isInternational ? "🌍" : flagEmoji(a.countryCode) || "🏳️"}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium text-text-primary">{a.name}</span>
                <span className="shrink-0 text-[11px] text-text-muted">
                  {a._count.ranks} {a.isInternational ? "cat." : "rank"}
                  {a._count.ranks === 1 ? "" : "s"}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const MEDALS = ["🥇", "🥈", "🥉"];

function RankItem({
  rank,
  position,
  isFirst,
  isLast,
  onRename,
  onMove,
  onDelete,
}: {
  rank: Rank;
  position: number;
  isFirst: boolean;
  isLast: boolean;
  onRename: (name: string) => void;
  onMove: (direction: "up" | "down") => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(rank.name);
  const holders = rank._count.members + rank._count.internationalMembers;
  const badge = MEDALS[position] ?? String(position + 1);

  return (
    <div data-testid="rank-row" className="flex items-center gap-3 px-4 py-3 text-sm">
      <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-dark-900 text-sm font-semibold ring-1 ring-dark-600">
        {badge}
      </span>

      {editing ? (
        <>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-9 flex-1"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onRename(name.trim());
                setEditing(false);
              }
            }}
          />
          <IconButton
            icon="check"
            label="Save"
            onClick={() => {
              onRename(name.trim());
              setEditing(false);
            }}
          />
          <IconButton
            icon="x"
            label="Cancel"
            onClick={() => {
              setName(rank.name);
              setEditing(false);
            }}
          />
        </>
      ) : (
        <>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium text-text-primary">{rank.name}</div>
            <div className="flex items-center gap-1 text-[11px] text-text-muted">
              <Icon path={ICONS.users} className="h-3 w-3" />
              {holders} referee{holders === 1 ? "" : "s"}
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <IconButton icon="chevronUp" label="Move up" disabled={isFirst} onClick={() => onMove("up")} />
            <IconButton
              icon="chevronDown"
              label="Move down"
              disabled={isLast}
              onClick={() => onMove("down")}
            />
            <IconButton icon="pencil" label="Rename" onClick={() => setEditing(true)} />
            <IconButton icon="trash" label="Delete" tone="danger" onClick={onDelete} />
          </div>
        </>
      )}
    </div>
  );
}
