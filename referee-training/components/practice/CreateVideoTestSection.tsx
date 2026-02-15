"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CompactSpinner } from "@/components/ui/compact-spinner";
import { VideoCategoryFilter, type CategoryFilterValue } from "./VideoCategoryFilter";

export function CreateVideoTestSection({ onCreated }: { onCreated?: (testId: string) => void }) {
  const [name, setName] = useState("");
  const [filters, setFilters] = useState<CategoryFilterValue>({ categoryTags: [] });
  const [availableCount, setAvailableCount] = useState(0);
  const [loadingCount, setLoadingCount] = useState(false);
  const [totalClips, setTotalClips] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const hasCategory = filters.categoryTags.length > 0;

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(() => {
      setLoadingCount(true);
      fetch("/api/tests/videos/eligible", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (cancelled) return;
          setAvailableCount(data.count ?? 0);
        })
        .catch(() => {
          if (!cancelled) setAvailableCount(0);
        })
        .finally(() => {
          if (!cancelled) setLoadingCount(false);
        });
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [filters]);

  useEffect(() => {
    if (availableCount > 0 && totalClips > availableCount) {
      setTotalClips(availableCount);
    }
  }, [availableCount, totalClips]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (!hasCategory) {
        throw new Error("Select at least one category");
      }
      const res = await fetch("/api/tests/videos/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          totalClips,
          filters,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to create test");
      setName("");
      setFilters({ categoryTags: [] });
      setTotalClips(10);
      setSuccess("Test created. Find it under Public & my tests.");
      onCreated?.(data?.test?.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create test");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center">
      <form onSubmit={submit} className="w-full max-w-md space-y-5">
        <div className="rounded-2xl border border-dark-600 bg-dark-800/50 p-5 space-y-4">
          {/* Test name */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wider">
              Test name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My practice test"
              required
              className="bg-dark-900 border-dark-600 text-white text-sm"
            />
          </div>

          {/* Category filter */}
          <VideoCategoryFilter value={filters} onChange={setFilters} countScope="user-video-tests" />

          {/* Total videos + Points — side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-dark-600 bg-dark-900/60 px-3 py-2.5">
              <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1.5">
                Total videos
              </p>
              <CompactSpinner
                value={totalClips}
                onChange={(val) => setTotalClips(val)}
                min={1}
                max={availableCount > 0 ? availableCount : 50}
              />
              <p className="text-[10px] text-text-muted mt-1">
                {loadingCount ? "Checking…" : `${availableCount} available`}
              </p>
            </div>

            <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-2.5">
              <p className="text-[10px] font-medium text-cyan-400 uppercase tracking-wider mb-1.5">
                Points per question
              </p>
              <p className="text-lg font-bold text-white tabular-nums leading-tight">
                {totalClips > 0 ? (100 / totalClips).toFixed(1) : "—"}
              </p>
              <p className="text-[10px] text-text-muted mt-0.5">
                {totalClips > 0 ? `${totalClips} questions = 100 pts` : "Set at least 1"}
              </p>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-status-danger">{error}</p>}
        {success && <p className="text-sm text-status-success">{success}</p>}

        <Button
          type="submit"
          className="w-full"
          disabled={
            loading ||
            !hasCategory ||
            availableCount === 0 ||
            totalClips <= 0 ||
            totalClips > availableCount
          }
        >
          {loading ? "Creating…" : "Create and save to my tests"}
        </Button>
      </form>
    </div>
  );
}
