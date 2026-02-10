"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CompactSpinner } from "@/components/ui/compact-spinner";
import { VideoCategoryFilter, type CategoryFilterValue } from "./VideoCategoryFilter";

export function CreateVideoTestSection({ onCreated }: { onCreated?: () => void }) {
  const [name, setName] = useState("");
  const [filters, setFilters] = useState<CategoryFilterValue>({ categoryTags: [] });
  const [availableCount, setAvailableCount] = useState(0);
  const [loadingCount, setLoadingCount] = useState(false);
  const [totalClips, setTotalClips] = useState(10);
  const [passingScore, setPassingScore] = useState("");
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
          passingScore: passingScore.trim() ? Number(passingScore) : null,
          filters,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to create test");
      setName("");
      setPassingScore("");
      setTotalClips(10);
      setSuccess("Test created. Find it under Public & my tests.");
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create test");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-dark-600 bg-dark-800/50 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Test name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My practice test"
              required
              className="bg-dark-800 border-dark-600 text-white"
            />
          </div>

          <VideoCategoryFilter value={filters} onChange={setFilters} />

          <div className="flex items-center justify-between rounded-xl border border-dark-600 bg-dark-900/60 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-text-secondary">Total videos</p>
              <p className="text-xs text-text-muted">
                {loadingCount ? "Checking availability…" : `${availableCount} available`}
              </p>
            </div>
            <CompactSpinner
              value={totalClips}
              onChange={(val) => setTotalClips(val)}
              min={1}
              max={availableCount > 0 ? availableCount : 50}
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-dark-600 bg-dark-900/60 px-4 py-3">
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

        <div className="rounded-2xl border border-dark-600 bg-dark-800/50 p-6 space-y-3">
          <p className="text-sm font-medium text-text-secondary">How it works</p>
          <div className="rounded-xl border border-dark-700 bg-dark-900/60 px-4 py-3 space-y-1">
            <p className="text-sm text-text-secondary">Randomized selection</p>
            <p className="text-xs text-text-muted">
              Videos are randomly chosen from your selected categories.
            </p>
          </div>
          <div className="rounded-xl border border-dark-700 bg-dark-900/60 px-4 py-3 space-y-1">
            <p className="text-sm text-text-secondary">No spoilers</p>
            <p className="text-xs text-text-muted">
              You won’t see the clips before the test starts.
            </p>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-status-danger">{error}</p>}
      {success && <p className="text-sm text-status-success">{success}</p>}
      <Button
        type="submit"
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
  );
}
