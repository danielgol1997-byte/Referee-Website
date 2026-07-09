"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { TestHistoryList } from "@/components/ui/test-history-list";

type HistoryEntry = {
  id: string;
  score: number | null;
  totalClips: number;
  completedAt: string | null;
};

export function ArPracticeLanding() {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [activeClipCount, setActiveClipCount] = useState<number | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/tests/ar/history")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || data.error) return;
        setHistory(data.history ?? []);
        setActiveClipCount(typeof data.activeClipCount === "number" ? data.activeClipCount : null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleStart = async () => {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/tests/ar/start", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to start test");
      router.push(`/practice/ar/${data.session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start test");
      setStarting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* ─── Hero card ─── */}
      <div className="relative rounded-xl border border-dark-600 bg-dark-800/80 backdrop-blur-sm overflow-hidden shadow-xl">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-transparent to-cyan-400/20" />
        </div>
        <div className="relative p-6 md:p-10 text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-dark-900/80 border border-accent/30 shadow-lg shadow-accent/10">
            <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-18l7 4-7 4m11 10v-18l7 4-7 4" />
            </svg>
            <span className="text-xs font-medium text-white uppercase tracking-wider">A.R. Practice</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Offside Decision Test
          </h1>
          <p className="mx-auto max-w-xl text-text-secondary">
            10 random clips, one viewing each. Call{" "}
            <span className="font-bold text-[#ef4444]">offside</span> or{" "}
            <span className="font-bold text-[#22c55e]">onside</span>.
          </p>
          <div className="pt-1">
            <button
              type="button"
              onClick={handleStart}
              disabled={starting || activeClipCount === 0}
              className={cn(
                "px-10 py-4 rounded-xl font-bold text-lg uppercase tracking-wider transition-all duration-200",
                "bg-gradient-to-r from-accent to-cyan-400 text-dark-900 border border-cyan-300/40",
                "hover:shadow-xl hover:shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98]",
                "disabled:opacity-60 disabled:pointer-events-none"
              )}
            >
              {starting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-dark-900/30 border-t-dark-900" />
                  Starting…
                </span>
              ) : (
                "Start Test"
              )}
            </button>
          </div>
          {error && (
            <div className="mx-auto max-w-md rounded-lg bg-status-dangerBg border border-status-danger/30 px-4 py-2.5">
              <p className="text-sm text-status-danger">{error}</p>
            </div>
          )}
          {activeClipCount === 0 && (
            <p className="text-xs font-semibold text-status-danger">
              No clips available yet.
            </p>
          )}
        </div>
      </div>

      {/* ─── History ─── */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-dark-600" />
          <h2 className="text-lg font-semibold text-white uppercase tracking-wider">Recent Tests</h2>
          <div className="flex-1 h-px bg-dark-600" />
        </div>

        {historyLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-8 h-8 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-secondary">
            No completed tests yet. Your results will appear here.
          </p>
        ) : (
          <TestHistoryList
            entries={history.map((entry) => ({
              id: entry.id,
              href: `/practice/ar/${entry.id}/results`,
              score: entry.score,
              total: entry.totalClips,
              completedAt: entry.completedAt,
            }))}
          />
        )}
      </div>
    </div>
  );
}
