"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type TestHistoryEntry = {
  id: string;
  href: string;
  title?: string | null;
  score: number | null;
  total: number;
  completedAt: string | null;
};

const DRAG_THRESHOLD_PX = 5;

/**
 * Vertical list of completed-test banners (AR "Recent Tests" style).
 * The list area is height-capped and scrollable via mouse wheel,
 * click-and-drag, or the scrollbar.
 */
export function TestHistoryList({
  entries,
  className,
}: {
  entries: TestHistoryEntry[];
  className?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startY: number; startScrollTop: number; moved: boolean } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || !listRef.current) return;
    dragState.current = {
      startY: e.clientY,
      startScrollTop: listRef.current.scrollTop,
      moved: false,
    };
    setIsDragging(true);
    // Prevent native link/image dragging and text selection while grabbing
    e.preventDefault();
  };

  useEffect(() => {
    if (!isDragging) return;
    const onMouseMove = (e: MouseEvent) => {
      const el = listRef.current;
      const state = dragState.current;
      if (!el || !state) return;
      const deltaY = e.clientY - state.startY;
      if (Math.abs(deltaY) > DRAG_THRESHOLD_PX) state.moved = true;
      el.scrollTop = state.startScrollTop - deltaY;
    };
    const onMouseUp = () => {
      setIsDragging(false);
      // The click that ends a drag fires synchronously after mouseup, so it is
      // still suppressed; this just keeps the flag from leaking into later clicks.
      setTimeout(() => {
        if (dragState.current) dragState.current.moved = false;
      }, 0);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging]);

  // If the pointer actually dragged, swallow the click so links don't navigate
  const handleClickCapture = (e: React.MouseEvent) => {
    if (dragState.current?.moved) {
      e.preventDefault();
      e.stopPropagation();
      dragState.current.moved = false;
    }
  };

  return (
    <div
      ref={listRef}
      onMouseDown={handleMouseDown}
      onClickCapture={handleClickCapture}
      className={cn(
        "test-history-scroll mx-auto w-full max-w-3xl space-y-3 overflow-y-auto max-h-96 pr-2 select-none",
        isDragging ? "cursor-grabbing" : "cursor-grab",
        className
      )}
    >
      {entries.map((entry) => {
        const pct = entry.total > 0 ? Math.round(((entry.score ?? 0) / entry.total) * 100) : 0;
        const dateLabel = entry.completedAt
          ? new Date(entry.completedAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "—";
        return (
          <Link
            key={entry.id}
            href={entry.href}
            draggable={false}
            className={cn(
              "group flex items-center justify-between gap-4 rounded-xl border border-dark-600 bg-dark-800/70 px-5 py-4",
              "transition-all duration-200 hover:border-cyan-400/50 hover:bg-dark-700/70 hover:shadow-lg"
            )}
          >
            <div className="flex items-center gap-4 min-w-0">
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-black tabular-nums",
                  pct >= 70
                    ? "bg-[#22c55e]/15 text-[#22c55e] border-2 border-[#22c55e]/50"
                    : "bg-[#ef4444]/15 text-[#ef4444] border-2 border-[#ef4444]/50"
                )}
              >
                {pct}%
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {entry.title ?? `${entry.score ?? 0} / ${entry.total} correct`}
                </p>
                <p className="text-xs text-text-secondary truncate">
                  {entry.title
                    ? `${entry.score ?? 0} / ${entry.total} correct · ${dateLabel}`
                    : dateLabel}
                </p>
              </div>
            </div>
            <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-text-muted transition-colors group-hover:text-cyan-300">
              View results →
            </span>
          </Link>
        );
      })}
    </div>
  );
}
