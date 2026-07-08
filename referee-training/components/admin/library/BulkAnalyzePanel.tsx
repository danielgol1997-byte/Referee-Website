"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface QueueItem {
  id: string;
  title: string;
  status: string;
}

interface BulkAnalyzePanelProps {
  /** Called after each processed video so the parent can refresh the list. */
  onProgress?: () => void;
}

/**
 * "AI index all videos" panel — shows coverage, and runs the analysis
 * pipeline over every video that isn't indexed yet, one at a time, with
 * live progress. Safe to leave running; can be stopped between videos.
 */
export function BulkAnalyzePanel({ onProgress }: BulkAnalyzePanelProps) {
  const [total, setTotal] = useState<number | null>(null);
  const [approved, setApproved] = useState<number>(0);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTitle, setCurrentTitle] = useState<string | null>(null);
  const [doneCount, setDoneCount] = useState(0);
  const [runTotal, setRunTotal] = useState(0);
  const [failures, setFailures] = useState<Array<{ title: string; error: string }>>([]);
  const [finishedMsg, setFinishedMsg] = useState<string | null>(null);
  const stopRef = useRef(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/library/videos/analyze-all");
      if (!res.ok) return;
      const data = await res.json();
      setTotal(data.total ?? 0);
      setApproved(data.approved ?? 0);
      setQueue(Array.isArray(data.queue) ? data.queue : []);
    } catch {
      // non-fatal
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const runQueue = async (items: QueueItem[]) => {
    if (items.length === 0 || isRunning) return;
    stopRef.current = false;
    setIsRunning(true);
    setFinishedMsg(null);
    setFailures([]);
    setDoneCount(0);
    setRunTotal(items.length);

    let processed = 0;
    const errors: Array<{ title: string; error: string }> = [];

    for (const item of items) {
      if (stopRef.current) break;
      setCurrentTitle(item.title);
      try {
        const res = await fetch(`/api/admin/library/videos/${item.id}/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          errors.push({ title: item.title, error: data.error || `Error ${res.status}` });
        }
      } catch (err: any) {
        errors.push({ title: item.title, error: err?.message || "Request failed" });
      }
      processed += 1;
      setDoneCount(processed);
      setFailures([...errors]);
      onProgress?.();
    }

    setCurrentTitle(null);
    setIsRunning(false);
    setFinishedMsg(
      stopRef.current
        ? `Stopped after ${processed} of ${items.length} videos.`
        : `Done — ${processed - errors.length} of ${items.length} videos analyzed and indexed${errors.length > 0 ? `, ${errors.length} failed` : ""}.`
    );
    fetchStatus();
  };

  if (isLoading || total === null) return null;

  const pending = queue.length;
  const pct = total > 0 ? Math.round((approved / total) * 100) : 0;
  const runPct = runTotal > 0 ? Math.round((doneCount / runTotal) * 100) : 0;

  return (
    <div className="rounded-2xl border border-dark-600 bg-dark-800/40 px-5 py-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <svg className="w-4 h-4 text-cyan-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
          </svg>
          <div>
            <p className="text-sm font-semibold text-text-primary">
              AI Search Index — {approved} of {total} videos indexed ({pct}%)
            </p>
            <p className="text-xs text-text-muted">
              {isRunning
                ? "Each video takes 1–3 minutes. Keep this tab open."
                : pending > 0
                  ? `${pending} video${pending === 1 ? "" : "s"} not indexed yet. New uploads are analyzed automatically.`
                  : "All videos are indexed. New uploads are analyzed automatically."}
            </p>
          </div>
        </div>

        {isRunning ? (
          <button
            type="button"
            onClick={() => { stopRef.current = true; }}
            className="px-4 py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-sm font-semibold hover:bg-red-500/25 transition-colors"
          >
            Stop after current video
          </button>
        ) : pending > 0 ? (
          <button
            type="button"
            onClick={() => runQueue(queue)}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-cyan-600 text-white text-sm font-semibold hover:from-emerald-500 hover:to-cyan-500 transition-all"
          >
            Analyze {pending} remaining video{pending === 1 ? "" : "s"}
          </button>
        ) : null}
      </div>

      {/* Progress while running */}
      {isRunning && (
        <div className="space-y-1.5">
          <div className="h-2 rounded-full bg-dark-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500"
              style={{ width: `${runPct}%` }}
            />
          </div>
          <p className="text-xs text-text-muted flex items-center gap-2">
            <svg className="w-3 h-3 animate-spin text-cyan-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            {doneCount} / {runTotal} done{currentTitle ? <> — analyzing <span className="text-text-primary truncate max-w-[18rem] inline-block align-bottom">{currentTitle}</span></> : null}
          </p>
        </div>
      )}

      {finishedMsg && !isRunning && (
        <p className={cn(
          "text-xs rounded-lg px-3 py-2 border",
          failures.length > 0
            ? "text-amber-300 bg-amber-500/10 border-amber-500/20"
            : "text-green-400 bg-green-500/10 border-green-500/20"
        )}>
          {finishedMsg}
        </p>
      )}

      {failures.length > 0 && (
        <details className="text-xs text-text-muted">
          <summary className="cursor-pointer hover:text-text-primary">
            {failures.length} failure{failures.length === 1 ? "" : "s"} — click to view
          </summary>
          <ul className="mt-1.5 space-y-1 pl-4 list-disc">
            {failures.map((f, i) => (
              <li key={i}>
                <span className="text-text-primary">{f.title}</span>: {f.error}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
