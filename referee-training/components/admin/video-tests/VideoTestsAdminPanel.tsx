"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CompactSpinner } from "@/components/ui/compact-spinner";
import { AdminVideoFilterBar, type AdminVideoFilters } from "@/components/admin/library/AdminVideoFilterBar";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useModal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

const TYPE_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "MANDATORY", label: "Mandatory" },
  { value: "PUBLIC", label: "Public" },
];
const VISIBILITY_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "visible", label: "Visible" },
  { value: "hidden", label: "Hidden" },
];

type VideoTest = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  totalClips: number;
  passingScore?: number | null;
  maxViewsPerClip?: number | null;
  dueDate: string | null;
  adminFilters?: AdminVideoFilters | null;
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

function normalizeAdminFilters(input: unknown): AdminVideoFilters | null {
  if (!input || typeof input !== "object") return null;
  const parsed = input as Partial<AdminVideoFilters>;
  const search = typeof parsed.search === "string" ? parsed.search : "";
  const activeStatus =
    parsed.activeStatus === "all" || parsed.activeStatus === "active" || parsed.activeStatus === "inactive"
      ? parsed.activeStatus
      : "all";
  const featuredStatus =
    parsed.featuredStatus === "all" || parsed.featuredStatus === "featured" || parsed.featuredStatus === "normal"
      ? parsed.featuredStatus
      : "all";
  const customTagFilters =
    parsed.customTagFilters && typeof parsed.customTagFilters === "object"
      ? Object.fromEntries(
          Object.entries(parsed.customTagFilters).map(([k, v]) => [
            k,
            Array.isArray(v) ? v.filter((item): item is string => typeof item === "string") : [],
          ])
        )
      : {};

  return {
    search,
    activeStatus,
    featuredStatus,
    customTagFilters,
  };
}

export function VideoTestsAdminPanel() {
  const modal = useModal();
  const [subTab, setSubTab] = useState<AdminSubTab>("create");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [visibilityFilter, setVisibilityFilter] = useState<string>("all");
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
  const [passingScore, setPassingScore] = useState("70");
  const [usePassingScore, setUsePassingScore] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [maxViewsPerClip, setMaxViewsPerClip] = useState("0");
  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [version, setVersion] = useState(0);
  const [invalidFields, setInvalidFields] = useState<Set<string>>(new Set());
  const [focusedManageTestId, setFocusedManageTestId] = useState<string | null>(null);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [deletingTestId, setDeletingTestId] = useState<string | null>(null);
  const [togglingVisibilityId, setTogglingVisibilityId] = useState<string | null>(null);
  const stepTwoRef = useRef<HTMLDivElement | null>(null);
  const isApplyingEditRef = useRef(false);

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

  useEffect(() => {
    if (isApplyingEditRef.current) return;
    if (type === "MANDATORY") {
      if (!maxViewsPerClip || Number(maxViewsPerClip) <= 0) {
        setMaxViewsPerClip("2");
      }
      return;
    }
    setMaxViewsPerClip("0");
    setUsePassingScore(false);
    // Only run when switching type so public value is editable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  useEffect(() => {
    if (subTab !== "manage" || !focusedManageTestId) return;
    const handle = window.setTimeout(() => {
      const el = document.getElementById(`admin-manage-test-${focusedManageTestId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
    return () => window.clearTimeout(handle);
  }, [subTab, focusedManageTestId, tests.length, typeFilter, visibilityFilter]);

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

  const canContinueToStepTwo =
    name.trim().length > 0 &&
    totalClips > 0 &&
    (type !== "MANDATORY" ||
      (Number(passingScore || 0) >= 0 &&
        Number(maxViewsPerClip || 0) > 0 &&
        dueDate.trim().length > 0));

  const moveToStepTwo = () => {
    if (canContinueToStepTwo) {
      setError(null);
      setInvalidFields(new Set());
      setCreateStep(2);
      setTimeout(() => stepTwoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
      return;
    }
    const invalid = new Set<string>();
    if (!name.trim()) invalid.add("name");
    if (type === "MANDATORY") {
      if (!dueDate.trim()) invalid.add("dueDate");
      if (Number(maxViewsPerClip || 0) <= 0) invalid.add("maxViewsPerClip");
    }
    setInvalidFields(invalid);
    setError("Complete the required fields before selecting clips.");
    setTimeout(() => setInvalidFields(new Set()), 2000);
  };

  const resetCreateForm = () => {
    setEditingTestId(null);
    setIsActive(true);
    setName("");
    setDescription("");
    setDueDate("");
    setType("PUBLIC");
    setPassingScore("70");
    setUsePassingScore(false);
    setMaxViewsPerClip("0");
    setTotalClips(10);
    setSelectedClipIds([]);
    setFilters({
      search: "",
      activeStatus: "active",
      featuredStatus: "all",
      customTagFilters: {},
    });
    setCreateStep(1);
    setSelectionError(null);
    setInvalidFields(new Set());
  };

  const beginFullEdit = (test: VideoTest) => {
    const initialFilters = normalizeAdminFilters(test.adminFilters) || {
      search: "",
      activeStatus: "all" as const,
      featuredStatus: "all" as const,
      customTagFilters: {},
    };

    isApplyingEditRef.current = true;
    setEditingTestId(test.id);
    setIsActive(test.isActive ?? true);
    setName(test.name || "");
    setDescription(test.description || "");
    setType((test.type === "MANDATORY" ? "MANDATORY" : "PUBLIC") as "MANDATORY" | "PUBLIC");
    setDueDate(test.dueDate ? new Date(test.dueDate).toISOString().split("T")[0] : "");
    const clipCount = test.clips?.length ?? test.totalClips ?? 1;
    setTotalClips(Math.max(1, clipCount));
    setPassingScore(String(test.passingScore ?? 70));
    setUsePassingScore(test.type === "PUBLIC" && test.passingScore !== null && test.passingScore !== undefined);
    setMaxViewsPerClip(
      String(test.maxViewsPerClip ?? (test.type === "MANDATORY" ? 2 : 0))
    );
    setSelectedClipIds(test.clips?.map((c) => c.videoClip.id) ?? []);
    setFilters(initialFilters);
    setCreateStep(1);
    setSubTab("create");
    setError(null);
    setSuccess(null);
    window.setTimeout(() => {
      isApplyingEditRef.current = false;
    }, 0);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const isEditMode = !!editingTestId;
      const res = await fetch(isEditMode ? `/api/admin/video-tests/${editingTestId}` : "/api/admin/video-tests", {
        method: isEditMode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          type,
          totalClips,
          isActive,
          passingScore:
            type === "MANDATORY" || usePassingScore
              ? Number(passingScore) || 70
              : null,
          maxViewsPerClip: maxViewsPerClip.trim() ? Number(maxViewsPerClip) : null,
          dueDate: dueDate || null,
          selectedClipIds,
          filters,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? (isEditMode ? "Failed to update test" : "Failed to create test"));
      resetCreateForm();
      setSuccess(isEditMode ? "Video test updated." : "Video test created.");
      setSubTab("manage");
      setTypeFilter("all");
      if (data?.test?.id) {
        setFocusedManageTestId(data.test.id);
        setTests((prev) => {
          const without = prev.filter((t) => t.id !== data.test.id);
          return [data.test, ...without];
        });
      }
      setVersion((v) => v + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save test");
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (test: VideoTest) => {
    setTogglingVisibilityId(test.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/video-tests/${test.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !test.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to update visibility");
      setTests((prev) =>
        prev.map((t) => (t.id === test.id ? { ...t, isActive: !t.isActive } : t))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle visibility");
    } finally {
      setTogglingVisibilityId(null);
    }
  };

  const deleteTest = async (test: VideoTest) => {
    const confirmed = await modal.showConfirm(
      `Are you sure you want to delete "${test.name}"?`,
      "Delete Video Test",
      "warning"
    );
    if (!confirmed) return;
    setDeletingTestId(test.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/video-tests/${test.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to delete test");
      setTests((prev) => prev.filter((t) => t.id !== test.id));
      if (focusedManageTestId === test.id) setFocusedManageTestId(null);
      if (editingTestId === test.id) resetCreateForm();
      setSuccess("Test deleted.");
      await modal.showSuccess("Video test deleted successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete test");
      await modal.showError("Failed to delete video test");
    } finally {
      setDeletingTestId(null);
    }
  };

  const filteredTests = tests.filter((t) => {
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (visibilityFilter === "visible" && !t.isActive) return false;
    if (visibilityFilter === "hidden" && t.isActive) return false;
    return true;
  });

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
          {editingTestId ? "Edit test" : "Create test"}
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
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-white">
              {editingTestId ? "Edit video test" : "Create video test"}
            </h2>
            {editingTestId && (
              <button
                type="button"
                onClick={() => {
                  resetCreateForm();
                  setSuccess(null);
                  setError(null);
                }}
                className="text-xs font-semibold text-text-secondary hover:text-white uppercase tracking-wider"
              >
                Cancel editing
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className={cn(
              "h-8 min-w-8 px-2 rounded-full border text-xs font-bold flex items-center justify-center",
              createStep === 1 ? "border-cyan-400 bg-cyan-500/20 text-cyan-300" : "border-dark-600 text-text-secondary"
            )}>
              1
            </div>
            <p className="text-sm text-text-secondary">Configure test</p>
            <div className="h-px flex-1 bg-dark-600" />
            <div className={cn(
              "h-8 min-w-8 px-2 rounded-full border text-xs font-bold flex items-center justify-center",
              createStep === 2 ? "border-cyan-400 bg-cyan-500/20 text-cyan-300" : "border-dark-600 text-text-secondary"
            )}>
              2
            </div>
            <p className="text-sm text-text-secondary">
              {editingTestId ? "Pick clips and save" : "Pick clips and create"}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-6">
            {createStep === 1 && (
            <div className="rounded-2xl border border-dark-600 bg-dark-800/50 p-6 space-y-5">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-text-secondary mb-1">Name</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Test name"
                    required
                    className={cn("bg-dark-800 transition-colors duration-500", invalidFields.has("name") ? "border-status-danger" : "border-dark-600")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Type</label>
                  <Select
                    value={type}
                    onChange={(val) => setType(val as "MANDATORY" | "PUBLIC")}
                    options={[
                      { value: "PUBLIC", label: "Public" },
                      { value: "MANDATORY", label: "Mandatory" },
                    ]}
                    placeholder="Select type..."
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-text-secondary">Visible</label>
                  <button
                    type="button"
                    onClick={() => setIsActive((prev) => !prev)}
                    className={cn(
                      "relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-all duration-200",
                      "focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-dark-900",
                      "shadow-lg ring-2",
                      isActive
                        ? "bg-accent ring-accent/50 shadow-cyan-500/20"
                        : "bg-dark-600 ring-dark-500"
                    )}
                    role="switch"
                    aria-checked={isActive}
                    title={isActive ? "Test is visible to users" : "Test is hidden from users"}
                  >
                    <span
                      className={cn(
                        "inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200",
                        isActive ? "translate-x-6" : "translate-x-1"
                      )}
                    />
                  </button>
                  <span className="text-xs text-text-muted">{isActive ? "Visible" : "Hidden"}</span>
                </div>
                <div className={cn("md:col-span-2", type === "MANDATORY" ? "lg:col-span-2" : "lg:col-span-3")}>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Description (optional)</label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description"
                    className="bg-dark-800 border-dark-600"
                  />
                </div>
                {type === "MANDATORY" && (
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Due date</label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className={cn("bg-dark-800 transition-colors duration-500", invalidFields.has("dueDate") ? "border-status-danger" : "border-dark-600")}
                    />
                  </div>
                )}
                <div className="flex items-center justify-between rounded-xl border border-dark-600 bg-dark-900/50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-text-secondary">Total clips</p>
                    <p className="text-xs text-text-muted">{eligibleTotal > 0 ? `${eligibleTotal} available` : "No matches yet"}</p>
                  </div>
                  <CompactSpinner
                    value={totalClips}
                    onChange={(val) => setTotalClips(val)}
                    min={1}
                    max={eligibleTotal > 0 ? eligibleTotal : 50}
                  />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-dark-600 bg-dark-900/50 px-4 py-3">
                  <div
                    className={cn(
                      "transition-opacity",
                      type === "PUBLIC" && !usePassingScore && "opacity-50"
                    )}
                  >
                    <p className="text-sm font-medium text-text-secondary">
                      Passing score {type === "MANDATORY" ? "(required)" : "(optional)"}
                    </p>
                    <p className="text-xs text-text-muted">0–100%</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {type === "PUBLIC" && (
                      <button
                        type="button"
                        onClick={() => {
                          setUsePassingScore((prev) => {
                            const next = !prev;
                            if (next && !passingScore.trim()) setPassingScore("70");
                            return next;
                          });
                        }}
                        className={cn(
                          "relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-all duration-200",
                          "focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-dark-900",
                          "shadow-lg ring-2",
                          usePassingScore
                            ? "bg-accent ring-accent/50 shadow-cyan-500/20"
                            : "bg-dark-600 ring-dark-500"
                        )}
                        role="switch"
                        aria-checked={usePassingScore}
                      >
                        <span
                          className={cn(
                            "inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200",
                            usePassingScore ? "translate-x-6" : "translate-x-1"
                          )}
                        />
                      </button>
                    )}
                    <div
                      className={cn(
                        "transition-opacity",
                        type === "PUBLIC" && !usePassingScore && "opacity-50"
                      )}
                    >
                      <CompactSpinner
                        value={Number(passingScore) || 70}
                        onChange={(val) => setPassingScore(String(val))}
                        min={0}
                        max={100}
                        disabled={type === "PUBLIC" && !usePassingScore}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-dark-600 bg-dark-900/50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-text-secondary">Max views per clip</p>
                    <p className="text-xs text-text-muted">
                      {type === "MANDATORY" ? "Required for mandatory tests (min 1)" : "Default: ∞ (unlimited)"}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "transition-all duration-500",
                      invalidFields.has("maxViewsPerClip") && "rounded-lg ring-2 ring-status-danger"
                    )}
                  >
                    <CompactSpinner
                      value={Number(maxViewsPerClip || 0)}
                      onChange={(val) => setMaxViewsPerClip(String(val))}
                      min={type === "MANDATORY" ? 1 : 0}
                      max={20}
                      allowInfinity={type === "PUBLIC"}
                      infinityValue={0}
                      infinitySymbol="∞"
                    />
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Points per question</p>
                <p className="text-sm text-white">
                  {totalClips > 0 ? `${(100 / totalClips).toFixed(2)} points each (${totalClips} questions = 100 points)` : "Set at least 1 question"}
                </p>
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={moveToStepTwo}
                >
                  Continue to clip selection
                </Button>
              </div>
            </div>
            )}

            {createStep === 2 && (
              <div ref={stepTwoRef} className="space-y-6">
                <div className="rounded-2xl border border-dark-600 bg-dark-800/50 p-4 flex items-center justify-between">
                  <div className="text-sm text-text-secondary">
                    <span className="text-white font-semibold">{name || "Untitled test"}</span> · {type} · {totalClips} clips
                    {(type === "MANDATORY" || usePassingScore) && ` · Pass ${passingScore || 70}%`}
                    {" · "}Max views {type === "PUBLIC" && Number(maxViewsPerClip || 0) === 0 ? "∞" : maxViewsPerClip}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreateStep(1)}
                    className="text-xs font-semibold text-accent hover:text-accent/80 uppercase tracking-wider"
                  >
                    Edit setup
                  </button>
                </div>

                <div className="rounded-2xl border border-dark-600 bg-dark-800/50 p-6 space-y-4">
                  <AdminVideoFilterBar filters={filters} onFiltersChange={setFilters} />
                  <div className="flex items-center justify-between text-xs text-text-muted border-t border-dark-600 pt-4">
                    <span>{eligibleLoading ? "Loading clips…" : `Matching clips: ${eligibleTotal}`}</span>
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

                <div className="rounded-2xl border border-dark-600 bg-dark-800/50 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-text-secondary">Selected clips</p>
                    <span className="text-xs text-text-muted">{selectedClipIds.length}/{totalClips} chosen · Auto-fill {Math.max(totalClips - selectedClipIds.length, 0)}</span>
                  </div>
                  {selectionError && <p className="text-xs text-status-danger">{selectionError}</p>}
                  {eligibleLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="w-10 h-10 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
                    </div>
                  ) : eligibleError ? (
                    <p className="text-sm text-status-danger">{eligibleError}</p>
                  ) : eligibleClips.length === 0 ? (
                    <p className="text-sm text-text-secondary text-center py-6">No clips match these filters.</p>
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
                                <Image
                                  src={clip.thumbnailUrl}
                                  alt={clip.title}
                                  width={96}
                                  height={64}
                                  className="h-full w-full object-cover"
                                  unoptimized
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-text-muted">
                                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}
                              {selected && <div className="absolute inset-0 bg-accent/20" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-white line-clamp-1">{clip.title}</p>
                              <p className="text-xs text-text-muted line-clamp-1">{clip.categoryTagLabel || "Uncategorized"}</p>
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
              </div>
            )}

            {error && <p className="text-sm text-status-danger">{error}</p>}
            {success && <p className="text-sm text-status-success">{success}</p>}
            {createStep === 2 && (
              <Button
                type="submit"
                disabled={
                  loading ||
                  eligibleTotal === 0 ||
                  totalClips <= 0 ||
                  totalClips > eligibleTotal ||
                  (type === "MANDATORY" && (Number(passingScore || 0) < 0 || Number(maxViewsPerClip || 0) <= 0))
                }
              >
                {loading ? (editingTestId ? "Saving…" : "Creating…") : (editingTestId ? "Save changes" : "Create video test")}
              </Button>
            )}
          </form>
        </div>
      )}

      {subTab === "manage" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-accent/20 bg-dark-800/50 p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Type
                </label>
                <SegmentedControl
                  value={typeFilter}
                  onChange={setTypeFilter}
                  options={TYPE_FILTER_OPTIONS}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Visibility
                </label>
                <SegmentedControl
                  value={visibilityFilter}
                  onChange={setVisibilityFilter}
                  options={VISIBILITY_FILTER_OPTIONS}
                />
              </div>
              <div className="flex-1" />
              <div className="text-xs text-text-muted">
                {filteredTests.length} of {tests.length} tests
              </div>
            </div>
          </div>

          {filteredTests.length === 0 ? (
            <p className="text-text-secondary">No video tests match the filters.</p>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {filteredTests.map((test) => (
                <div
                  key={test.id}
                  id={`admin-manage-test-${test.id}`}
                  className={cn(
                    "rounded-xl border bg-dark-800/50 p-4 transition-all",
                    focusedManageTestId === test.id
                      ? "border-cyan-400/80 ring-1 ring-cyan-400/70"
                      : "border-dark-600",
                    !test.isActive && "opacity-55 saturate-50"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate">{test.name}</p>
                      {test.description && (
                        <p className="text-xs text-text-secondary mt-1 line-clamp-2">{test.description}</p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full border font-semibold",
                            test.type === "MANDATORY"
                              ? "text-yellow-300 border-yellow-500/40 bg-yellow-500/10"
                              : "text-cyan-300 border-cyan-500/40 bg-cyan-500/10"
                          )}
                        >
                          {test.type}
                        </span>
                        {!test.isActive && (
                          <span className="px-2 py-0.5 rounded-full border font-semibold text-text-muted border-dark-500 bg-dark-700/60">
                            Hidden
                          </span>
                        )}
                        <span className="text-text-secondary">{test.clips?.length ?? test.totalClips} clips</span>
                        {test.passingScore !== null && test.passingScore !== undefined && (
                          <span className="text-text-secondary">Pass {test.passingScore}%</span>
                        )}
                        {test.maxViewsPerClip !== null && test.maxViewsPerClip !== undefined && (
                          <span className="text-text-secondary">Max {test.maxViewsPerClip <= 0 ? "∞" : test.maxViewsPerClip}</span>
                        )}
                        {test.dueDate && (
                          <span className="text-text-secondary">Due {new Date(test.dueDate).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleActive(test)}
                        disabled={togglingVisibilityId === test.id}
                        className="p-1.5 rounded-lg text-text-secondary hover:text-accent hover:bg-dark-700 transition-colors disabled:opacity-50"
                        title={test.isActive ? "Currently visible — click to hide" : "Currently hidden — click to show"}
                      >
                        {test.isActive ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => beginFullEdit(test)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-dark-500 text-text-secondary hover:text-white hover:border-cyan-500/60"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTest(test)}
                        disabled={deletingTestId === test.id}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors",
                          "border-status-danger/50 text-status-danger hover:bg-status-danger/10",
                          deletingTestId === test.id && "opacity-60 cursor-not-allowed"
                        )}
                      >
                        {deletingTestId === test.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
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
