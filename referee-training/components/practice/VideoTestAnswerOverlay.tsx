"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type VideoTestAnswerValue = {
  playOnNoOffence: boolean;
  restartTagId: string | null;
  sanctionTagId: string | null;
  criteriaTagIds: string[];
};

type TagOption = { id: string; slug: string; name: string };

interface VideoTestAnswerOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: () => void;
  actionLabel: string;
  actionDisabled?: boolean;
  tagOptions: {
    restarts: TagOption[];
    sanction: TagOption[];
    criteria: TagOption[];
  };
  value: VideoTestAnswerValue;
  onChange: (value: VideoTestAnswerValue) => void;
}

// Colour palette matching the site's filter system
const CATEGORY_COLORS: Record<string, string> = {
  restarts: "#4A90E2",  // blue
  sanction: "#EC4899",  // pink
  criteria: "#FFD93D",  // yellow
};

/* ─── Custom searchable dropdown ─── */
function FilterDropdown({
  label,
  color,
  options,
  selectedId,
  onSelect,
  disabled,
}: {
  label: string;
  color: string;
  options: TagOption[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(
    () => options.filter((t) => t.name.toLowerCase().includes(query.toLowerCase())),
    [options, query]
  );

  const selectedTag = useMemo(
    () => options.find((t) => t.id === selectedId) ?? null,
    [options, selectedId]
  );

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Focus search when opened
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const handleSelect = useCallback(
    (id: string | null) => {
      onSelect(id);
      setOpen(false);
      setQuery("");
    },
    [onSelect]
  );

  return (
    <div ref={containerRef} className="relative">
      {/* Category label */}
      <div
        className="text-xs font-bold uppercase tracking-widest mb-2 text-center"
        style={{ color }}
      >
        {label}
      </div>

      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) setOpen(!open); }}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
          "border bg-dark-800/80 backdrop-blur-sm",
          disabled && "opacity-50 cursor-not-allowed",
          open ? "border-opacity-100 shadow-lg" : "border-dark-600 hover:border-opacity-60"
        )}
        style={{
          borderColor: open ? color : undefined,
          boxShadow: open ? `0 0 0 1px ${color}40` : undefined,
        }}
      >
        {selectedTag ? (
          <span
            className="min-w-0 text-left whitespace-normal break-words font-medium text-sm rounded px-1.5 py-0.5 leading-snug"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {selectedTag.name}
          </span>
        ) : (
          <span className="min-w-0 text-left whitespace-normal break-words text-text-secondary leading-snug">Select {label.toLowerCase()}…</span>
        )}
        <svg
          className={cn("w-4 h-4 flex-shrink-0 transition-transform duration-200", open && "rotate-180")}
          style={{ color }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute z-50 mt-1 w-full rounded-lg border bg-dark-900/95 backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
          style={{ borderColor: `${color}40` }}
        >
          {/* Search inside the dropdown */}
          <div className="p-2 border-b" style={{ borderColor: `${color}20` }}>
            <div className="relative">
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                style={{ color: `${color}80` }}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}…`}
                className="w-full pl-8 pr-3 py-2 rounded-md bg-dark-800 border border-dark-600 text-white text-sm placeholder:text-text-secondary focus:outline-none focus:ring-1"
                style={{ borderColor: query ? color : undefined, boxShadow: query ? `0 0 0 1px ${color}40` : undefined }}
              />
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-48 overflow-y-auto overscroll-contain">
            {/* Clear selection option */}
            {selectedId && (
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-dark-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear selection
              </button>
            )}

            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-sm text-text-secondary text-center">
                No matches
              </div>
            ) : (
              filtered.map((tag) => {
                const isSelected = tag.id === selectedId;
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleSelect(tag.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2",
                      isSelected ? "font-semibold" : "hover:bg-dark-700"
                    )}
                    style={isSelected ? { backgroundColor: `${color}15`, color } : {}}
                  >
                    {isSelected && (
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    <span className={cn(!isSelected && "text-white")}>{tag.name}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main overlay ─── */
export function VideoTestAnswerOverlay({
  isOpen,
  onClose: _onClose,
  onAction,
  actionLabel,
  actionDisabled = false,
  tagOptions,
  value,
  onChange,
}: VideoTestAnswerOverlayProps) {
  const [hoveredMode, setHoveredMode] = useState<"playon" | "criteria" | null>(null);

  if (!isOpen) return null;

  const disabled = value.playOnNoOffence;
  const isComplete = value.playOnNoOffence ||
    (value.restartTagId !== null && value.sanctionTagId !== null && value.criteriaTagIds.length > 0);

  const setPlayOnNoOffence = (v: boolean) => {
    onChange({
      ...value,
      playOnNoOffence: v,
      ...(v ? { restartTagId: null, sanctionTagId: null, criteriaTagIds: [] } : {}),
    });
  };

  const criteriaTagId = value.criteriaTagIds[0] ?? null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
        style={{ zIndex: 100100 }}
      />
      <div
        className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto"
        style={{ zIndex: 100110 }}
      >
        <div
          className={cn(
            "relative w-full max-w-4xl backdrop-blur-xl bg-gradient-to-br from-dark-900/95 to-dark-800/95",
            "rounded-2xl shadow-2xl border border-accent/30",
            "transform transition-all duration-300",
            "animate-in fade-in zoom-in-95 duration-200"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-3 border-b border-accent/20">
            <h2 className="text-xl font-bold uppercase tracking-wider text-center text-accent">
              Your answer
            </h2>
          </div>

          {/* Body */}
          <div className="px-6 py-5">
            <div className="space-y-4">
              <button
                type="button"
                onMouseEnter={() => setHoveredMode("playon")}
                onMouseLeave={() => setHoveredMode(null)}
                onClick={() => setPlayOnNoOffence(!value.playOnNoOffence)}
                className={cn(
                  "w-full rounded-xl p-3 border text-left transition-all duration-200",
                  value.playOnNoOffence
                    ? "border-accent bg-accent/15 shadow-md shadow-accent/15"
                    : "border-dark-500 bg-dark-800/70 hover:border-accent/40 hover:bg-dark-800/95",
                  hoveredMode === "criteria" && "opacity-20",
                  hoveredMode === "playon" && "ring-1 ring-accent/40"
                )}
              >
                <div className="text-xs font-bold uppercase tracking-widest mb-2 text-center text-accent">
                  Play on
                </div>
                <div className="flex items-center justify-center gap-3">
                  <div className={cn(
                    "relative flex h-6 w-6 items-center justify-center rounded border-2 transition-all",
                    value.playOnNoOffence ? "border-accent bg-accent" : "border-dark-500 bg-dark-700"
                  )}>
                    {value.playOnNoOffence && (
                      <svg className="h-4 w-4 text-dark-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <p className="text-base font-semibold text-white">Play on / No Offence</p>
                </div>
              </button>

              {/* Decision fields */}
              <div
                onMouseEnter={() => setHoveredMode("criteria")}
                onMouseLeave={() => setHoveredMode(null)}
                className={cn(
                  "grid grid-cols-1 md:grid-cols-3 gap-5 md:pt-1 transition-all duration-300",
                  disabled && "opacity-40 pointer-events-none",
                  hoveredMode === "playon" && "opacity-20",
                  hoveredMode === "criteria" && "ring-1 ring-accent/30 rounded-xl p-2"
                )}
              >
                <div className="rounded-xl p-4 border transition-colors duration-200" style={{ borderColor: `${CATEGORY_COLORS.restarts}25`, backgroundColor: `${CATEGORY_COLORS.restarts}08` }}>
                  <FilterDropdown
                    label="Restart"
                    color={CATEGORY_COLORS.restarts}
                    options={tagOptions.restarts}
                    selectedId={value.restartTagId}
                    onSelect={(id) => onChange({ ...value, restartTagId: id })}
                    disabled={disabled}
                  />
                </div>
                <div className="rounded-xl p-4 border transition-colors duration-200" style={{ borderColor: `${CATEGORY_COLORS.sanction}25`, backgroundColor: `${CATEGORY_COLORS.sanction}08` }}>
                  <FilterDropdown
                    label="Sanction"
                    color={CATEGORY_COLORS.sanction}
                    options={tagOptions.sanction}
                    selectedId={value.sanctionTagId}
                    onSelect={(id) => onChange({ ...value, sanctionTagId: id })}
                    disabled={disabled}
                  />
                </div>
                <div className="rounded-xl p-4 border transition-colors duration-200" style={{ borderColor: `${CATEGORY_COLORS.criteria}25`, backgroundColor: `${CATEGORY_COLORS.criteria}08` }}>
                  <FilterDropdown
                    label="Criteria"
                    color={CATEGORY_COLORS.criteria}
                    options={tagOptions.criteria}
                    selectedId={criteriaTagId}
                    onSelect={(id) => onChange({ ...value, criteriaTagIds: id ? [id] : [] })}
                    disabled={disabled}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-accent/20 flex justify-end gap-3">
            <button
              onClick={onAction}
              disabled={!isComplete || actionDisabled}
              className={cn(
                "px-6 py-2.5 rounded-lg font-semibold text-sm uppercase tracking-wide transition-all duration-200",
                "bg-accent hover:bg-accent/90 text-dark-900",
                "hover:shadow-lg hover:shadow-accent/20",
                (!isComplete || actionDisabled) && "cursor-not-allowed opacity-60"
              )}
            >
              {actionLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
