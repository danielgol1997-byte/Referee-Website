"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CompactSpinner } from "@/components/ui/compact-spinner";
import { AdminVideoFilterBar, type AdminVideoFilters } from "@/components/admin/library/AdminVideoFilterBar";
import { cn } from "@/lib/utils";

type VideoTest = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  totalClips: number;
  passingScore?: number | null;
  dueDate: string | null;
  isActive: boolean;
  clips: { videoClip: { id: string; title: string } }[];
};

type EligibleClip = {
  id: string;
  title: string;
  thumbnailUrl?: string | null;
  duration?: number | null;
  categoryTagLabel?: string | null;
};

type AdminSubTab = "create" | "manage";

export function VideoTestsAdminPanel() {
  const [subTab, setSubTab] = useState<AdminSubTab>("create");
  const [manageFilter, setManageFilter] = useState<"all" | "MANDATORY" | "PUBLIC">("all");
  const [tests, setTests] = useState<VideoTest[]>([]);
  const [filters, setFilters] = useState<AdminVideoFilters>({
    search: "",
    activeStatus: "active",
    featuredStatus: "all",
    customTagFilters: {},
  });
  const [eligibleClips, setEligibleClips] = useState<EligibleClip[]>([]);
  const [eligibleTotal, setEligibleTotal] = useState(0);
  const [eligibleLoading, setEligibleLoading] = useState(false);
  const [eligibleError, setEligibleError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"MANDATORY" | "PUBLIC">("PUBLIC");
  const [dueDate, setDueDate] = useState("");
  const [totalClips, setTotalClips] = useState(10);
  const [passingScore, setPassingScore] = useState("");
  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setListLoading(true);
    fetch("/api/admin/video-tests")
      .then((r) => r.json())
      .then((testsData) => {
        if (cancelled) return;
        setTests(testsData.tests ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load");
      })
      .finally(() => {
        if (!cancelled) setListLoading(false);
      });
    return () => { cancelled = true; };
  }, [version]);

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(() => {
      setEligibleLoading(true);
      setEligibleError(null);
      fetch("/api/admin/video-tests/eligible", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (cancelled) return;
          setEligibleClips(data.clips ?? []);
          setEligibleTotal(data.total ?? data.clips?.length ?? 0);
        })
        .catch((err) => {
          if (!cancelled) setEligibleError(err instanceof Error ? err.message : "Failed to load clips");
        })
        .finally(() => {
          if (!cancelled) setEligibleLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [filters]);

  useEffect(() => {
    setSelectedClipIds((prev) => prev.filter((id) => eligibleClips.some((clip) => clip.id === id)));
  }, [eligibleClips]);

  useEffect(() => {
    if (eligibleTotal > 0 && totalClips > eligibleTotal) {
      setTotalClips(eligibleTotal);
    }
  }, [eligibleTotal, totalClips]);

  useEffect(() => {
    if (selectedClipIds.length > totalClips) {
      setSelectedClipIds((prev) => prev.slice(0, totalClips));
    }
  }, [selectedClipIds.length, totalClips]);

  useEffect(() => {
    if (selectionError && selectedClipIds.length < totalClips) {
      setSelectionError(null);
    }
  }, [selectionError, selectedClipIds.length, totalClips]);

  const toggleClip = (id: string) => {
    setSelectionError(null);
    setSelectedClipIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= totalClips) {
        setSelectionError("Increase total clips to select more.");
        return prev;
      }
      return [...prev, id];
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/video-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          type,
          totalClips,
          passingScore: passingScore.trim() ? Number(passingScore) : null,
          dueDate: dueDate || null,
          selectedClipIds,
          filters,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to create test");
      setName("");
      setDescription("");
      setDueDate("");
      setPassingScore("");
      setTotalClips(10);
      setSelectedClipIds([]);
      setSuccess("Video test created.");
      setVersion((v) => v + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create test");
    } finally {
      setLoading(false);
    }
  };

  const filteredTests =
    manageFilter === "all"
      ? tests
      : tests.filter((t) => t.type === manageFilter);

  if (listLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-10 h-10 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 p-1 bg-dark-800/50 border border-dark-600 rounded-xl">
        <button
          type="button"
          onClick={() => setSubTab("create")}
          className={cn(
            "flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold uppercase tracking-wider transition-all",
            subTab === "create"
              ? "bg-gradient-to-r from-cyan-500 to-cyan-600 text-dark-900"
              : "text-text-secondary hover:text-text-primary hover:bg-dark-700"
          )}
        >
          Create test
        </button>
        <button
          type="button"
          onClick={() => setSubTab("manage")}
          className={cn(
            "flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold uppercase tracking-wider transition-all",
            subTab === "manage"
              ? "bg-gradient-to-r from-cyan-500 to-cyan-600 text-dark-900"
              : "text-text-secondary hover:text-text-primary hover:bg-dark-700"
          )}
        >
          Manage tests
        </button>
      </div>

      {subTab === "create" && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white">Create video test</h2>

          <form onSubmit={submit} className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <div className="rounded-2xl border border-dark-600 bg-dark-800/50 p-6 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-text-secondary mb-1">Name</label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Test name"
                      required
                      className="bg-dark-800 border-dark-600"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-text-secondary mb-1">Description (optional)</label>
                    <Input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Optional description"
                      className="bg-dark-800 border-dark-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Type</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as "MANDATORY" | "PUBLIC")}
                      className="w-full px-3 py-2 rounded-lg bg-dark-800 border border-dark-600 text-white"
                    >
                      <option value="PUBLIC">Public</option>
                      <option value="MANDATORY">Mandatory</option>
                    </select>
                  </div>
                  {type === "MANDATORY" && (
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">Due date (optional)</label>
                      <Input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="bg-dark-800 border-dark-600"
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between rounded-xl border border-dark-600 bg-dark-900/50 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-text-secondary">Total clips</p>
                      <p className="text-xs text-text-muted">
                        {eligibleTotal > 0 ? `${eligibleTotal} available` : "No matches yet"}
                      </p>
                    </div>
                    <CompactSpinner
                      value={totalClips}
                      onChange={(val) => setTotalClips(val)}
                      min={1}
                      max={eligibleTotal > 0 ? eligibleTotal : 50}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-dark-600 bg-dark-900/50 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-text-secondary">Passing score (optional)</p>
                      <p className="text-xs text-text-muted">0–100%</p>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={passingScore}
                      onChange={(e) => setPassingScore(e.target.value)}
                      placeholder="70"
                      className="w-24 bg-dark-800 border-dark-600 text-right"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-dark-600 bg-dark-800/50 p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-text-secondary">Selection</p>
                  <span className="text-xs text-text-muted">
                    {selectedClipIds.length}/{totalClips} chosen
                  </span>
                </div>
                <div className="rounded-xl border border-dark-700 bg-dark-900/60 px-4 py-3 space-y-1">
                  <p className="text-sm text-text-secondary">Random fill</p>
                  <p className="text-xs text-text-muted">
                    {Math.max(totalClips - selectedClipIds.length, 0)} clips will be randomly added.
                  </p>
                </div>
                {selectionError && (
                  <p className="text-xs text-status-danger">{selectionError}</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-dark-600 bg-dark-800/50 p-6 space-y-4">
              <AdminVideoFilterBar filters={filters} onFiltersChange={setFilters} />
              <div className="flex items-center justify-between text-xs text-text-muted border-t border-dark-600 pt-4">
                <span>
                  {eligibleLoading ? "Loading clips…" : `Matching clips: ${eligibleTotal}`}
                </span>
                <button
                  type="button"
                  onClick={() => setFilters({
                    search: "",
                    activeStatus: "active",
                    featuredStatus: "all",
                    customTagFilters: {},
                  })}
                  className="text-xs font-semibold text-accent hover:text-accent/80 uppercase tracking-wider"
                >
                  Clear filters
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-dark-600 bg-dark-800/50 p-6">
              {eligibleLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-10 h-10 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
                </div>
              ) : eligibleError ? (
                <p className="text-sm text-status-danger">{eligibleError}</p>
              ) : eligibleClips.length === 0 ? (
                <p className="text-sm text-text-secondary text-center py-6">
                  No clips match these filters.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {eligibleClips.map((clip) => {
                    const selected = selectedClipIds.includes(clip.id);
                    return (
                      <button
                        type="button"
                        key={clip.id}
                        onClick={() => toggleClip(clip.id)}
                        className={cn(
                          "group flex items-center gap-4 rounded-xl border p-3 text-left transition-all",
                          selected
                            ? "border-accent bg-accent/10"
                            : "border-dark-600 bg-dark-900/60 hover:border-cyan-500/50"
                        )}
                      >
                        <div className="relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-dark-800">
                          {clip.thumbnailUrl ? (
                            <img
                              src={clip.thumbnailUrl}
                              alt={clip.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-text-muted">
                              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                          {selected && (
                            <div className="absolute inset-0 bg-accent/20" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white line-clamp-1">{clip.title}</p>
                          <p className="text-xs text-text-muted line-clamp-1">
                            {clip.categoryTagLabel || "Uncategorized"}
                          </p>
                        </div>
                        <div className={cn(
                          "ml-auto flex h-5 w-5 items-center justify-center rounded-full border",
                          selected ? "border-accent bg-accent text-dark-900" : "border-dark-600"
                        )}>
                          {selected && (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {error && <p className="text-sm text-status-danger">{error}</p>}
            {success && <p className="text-sm text-status-success">{success}</p>}
            <Button
              type="submit"
              disabled={
                loading ||
                eligibleTotal === 0 ||
                totalClips <= 0 ||
                totalClips > eligibleTotal
              }
            >
              {loading ? "Creating…" : "Create video test"}
            </Button>
          </form>
        </div>
      )}

      {subTab === "manage" && (
        <div>
          <h2 className="text-xl font-semibold text-white mb-2">Manage video tests</h2>
          <div className="flex gap-2 mb-4">
            {(["all", "MANDATORY", "PUBLIC"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setManageFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold uppercase",
                  manageFilter === f
                    ? "bg-accent/20 text-accent border border-accent/50"
                    : "text-text-secondary hover:text-white hover:bg-dark-700 border border-dark-600"
                )}
              >
                {f === "all" ? "All" : f === "MANDATORY" ? "Mandatory" : "Public"}
              </button>
            ))}
          </div>
          {filteredTests.length === 0 ? (
            <p className="text-text-secondary">No video tests{manageFilter !== "all" ? ` (${manageFilter})` : ""}.</p>
          ) : (
            <div className="space-y-2">
              {filteredTests.map((test) => (
                <div
                  key={test.id}
                  className="flex items-center justify-between rounded-lg border border-dark-600 bg-dark-800/50 px-4 py-3"
                >
                  <div>
                    <span className="font-medium text-white">{test.name}</span>
                    <span className="ml-2 text-xs text-text-secondary">
                      {test.type} · {test.clips?.length ?? test.totalClips} clips
                      {test.passingScore !== null && test.passingScore !== undefined && ` · Pass ${test.passingScore}%`}
                      {test.dueDate && ` · Due ${new Date(test.dueDate).toLocaleDateString()}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
