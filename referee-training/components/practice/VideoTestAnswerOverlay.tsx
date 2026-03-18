"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type VideoTestAnswerValue = {
  selectedOutcome: "play_on" | "offence" | null;
  playOnNoOffence: boolean;
  restartTagId: string | null;
  sanctionTagId: string | null;
  criteriaTagIds: string[];
};

type TagOption = { id: string; slug: string; name: string; isPlayOnCriteria?: boolean };

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
const ANSWER_GREEN = "#22c55e";
const ANSWER_RED = "#ef4444";

/* ─── Single-choice searchable panel (Restart / Sanction) ─── */
function OptionPanel({
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
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(
    () => options.filter((t) => t.name.toLowerCase().includes(query.toLowerCase())),
    [options, query]
  );

  const selectedTag = useMemo(
    () => options.find((t) => t.id === selectedId) ?? null,
    [options, selectedId]
  );

  const handleSelect = useCallback(
    (id: string | null) => { onSelect(id); },
    [onSelect]
  );

  return (
    <div className="rounded-xl border p-3" style={{ borderColor: `${color}35`, backgroundColor: `${color}08` }}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-xs font-bold uppercase tracking-widest" style={{ color }}>{label}</div>
        {selectedTag && (
          <button
            type="button"
            onClick={() => handleSelect(null)}
            className="rounded-md px-2 py-1 text-[11px] font-semibold transition-colors hover:bg-dark-700/80"
            style={{ color }}
          >
            Clear
          </button>
        )}
      </div>

      <div className="relative mb-2">
        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: `${color}80` }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${label.toLowerCase()}...`}
          disabled={disabled}
          className={cn(
            "w-full rounded-md border bg-dark-800 pl-8 pr-3 py-2 text-xs text-white placeholder:text-text-secondary focus:outline-none focus:ring-1",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          style={{ borderColor: `${color}45`, boxShadow: `0 0 0 1px ${color}20` }}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="py-3 text-center text-xs text-text-secondary">No matches</div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {filtered.map((tag) => {
            const isSelected = tag.id === selectedId;
            return (
              <button
                key={tag.id}
                type="button"
                disabled={disabled}
                onClick={() => handleSelect(tag.id)}
                title={tag.name}
                className={cn(
                  "rounded-lg border px-2.5 py-2 text-left text-xs font-medium leading-snug transition-all",
                  disabled && "opacity-50 cursor-not-allowed",
                  isSelected ? "shadow-md" : "hover:bg-dark-700/70"
                )}
                style={
                  isSelected
                    ? { borderColor: `${color}b3`, backgroundColor: `${color}20`, color, boxShadow: `0 8px 20px -12px ${color}` }
                    : { borderColor: `${color}35`, color: "#f5f8ff" }
                }
              >
                {tag.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Multi-choice searchable panel (Criteria — pick one or more) ─── */
function CriteriaPanel({
  color,
  options,
  selectedIds,
  onToggle,
  onClearAll,
  disabled,
}: {
  color: string;
  options: TagOption[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onClearAll: () => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => options.filter((t) => t.name.toLowerCase().includes(query.toLowerCase())),
    [options, query]
  );

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const count = selectedIds.length;

  return (
    <div className="rounded-xl border p-3" style={{ borderColor: `${color}35`, backgroundColor: `${color}08` }}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="text-xs font-bold uppercase tracking-widest" style={{ color }}>Criteria</div>
          {count > 0 && (
            <span
              className="rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none"
              style={{ backgroundColor: `${color}30`, color }}
            >
              {count}
            </span>
          )}
        </div>
        {count > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="rounded-md px-2 py-1 text-[11px] font-semibold transition-colors hover:bg-dark-700/80"
            style={{ color }}
          >
            Clear all
          </button>
        )}
      </div>

      {options.length > 0 && (
        <div className="relative mb-2">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: `${color}80` }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search criteria..."
            disabled={disabled}
            className={cn(
              "w-full rounded-md border bg-dark-800 pl-8 pr-3 py-2 text-xs text-white placeholder:text-text-secondary focus:outline-none focus:ring-1",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            style={{ borderColor: `${color}45`, boxShadow: `0 0 0 1px ${color}20` }}
          />
        </div>
      )}

      {options.length > 0 && (
        <p className="mb-2 text-[10px] text-text-muted">Select one or more</p>
      )}

      {options.length === 0 ? (
        <div className="py-4 text-center text-xs text-text-secondary italic">
          No criteria for this category — not required.
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-3 text-center text-xs text-text-secondary">No matches</div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {filtered.map((tag) => {
            const isSelected = selectedSet.has(tag.id);
            const isLong = tag.name.length > 35;
            return (
              <button
                key={tag.id}
                type="button"
                disabled={disabled}
                onClick={() => onToggle(tag.id)}
                className={cn(
                  "rounded-lg border px-2.5 py-2 text-left text-xs font-medium leading-snug transition-all",
                  disabled && "opacity-50 cursor-not-allowed",
                  isSelected ? "shadow-md" : "hover:bg-dark-700/70",
                  isLong && "sm:col-span-2"
                )}
                style={
                  isSelected
                    ? { borderColor: `${color}b3`, backgroundColor: `${color}20`, color, boxShadow: `0 8px 20px -12px ${color}` }
                    : { borderColor: `${color}35`, color: "#f5f8ff" }
                }
              >
                <div className="flex items-start gap-2">
                  <span
                    className={cn(
                      "mt-0.5 flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded border transition-all",
                      isSelected ? "border-transparent" : "border-current opacity-40"
                    )}
                    style={isSelected ? { backgroundColor: color } : {}}
                  >
                    {isSelected && (
                      <svg className="h-2.5 w-2.5 text-dark-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <span className="flex-1">{tag.name}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Main overlay ─── */
export function VideoTestAnswerOverlay({
  isOpen,
  onClose,
  onAction,
  actionLabel,
  actionDisabled = false,
  tagOptions,
  value,
  onChange,
}: VideoTestAnswerOverlayProps) {
  // All hooks must be above any early returns
  const selectedOutcome = value.selectedOutcome
    ?? (value.playOnNoOffence
      ? "play_on"
      : value.restartTagId !== null || value.sanctionTagId !== null || value.criteriaTagIds.length > 0
        ? "offence"
        : null);
  const isPlayOnSelected = selectedOutcome === "play_on";
  const isOffenceSelected = selectedOutcome === "offence";
  const showPanels = isPlayOnSelected || isOffenceSelected;

  // Auto-detect the canonical "play on" restart and "no card" sanction tags
  const playOnRestartTag = useMemo(() =>
    tagOptions.restarts.find((t) =>
      t.name.toLowerCase().includes("play on") ||
      t.name.toLowerCase().includes("play-on") ||
      t.slug.toLowerCase().includes("play-on") ||
      t.slug.toLowerCase().includes("play_on")
    ) ?? null,
    [tagOptions.restarts]
  );
  const noCardSanctionTag = useMemo(() =>
    tagOptions.sanction.find((t) =>
      t.name.toLowerCase().includes("no card") ||
      t.name.toLowerCase().includes("no disciplinary") ||
      t.name.toLowerCase().includes("no sanction") ||
      t.slug.toLowerCase().includes("no-card") ||
      t.slug.toLowerCase().includes("no-disciplinary")
    ) ?? null,
    [tagOptions.sanction]
  );

  // Only show criteria matching the current outcome type
  const visibleCriteria = useMemo(() => {
    if (isPlayOnSelected) return tagOptions.criteria.filter((t) => t.isPlayOnCriteria === true);
    if (isOffenceSelected) return tagOptions.criteria.filter((t) => t.isPlayOnCriteria !== true);
    return tagOptions.criteria;
  }, [tagOptions.criteria, isPlayOnSelected, isOffenceSelected]);

  // Criteria required only when options actually exist for the current outcome
  const criteriaRequired = useMemo(() => {
    if (isPlayOnSelected) return tagOptions.criteria.filter((t) => t.isPlayOnCriteria === true).length > 0;
    if (isOffenceSelected) return tagOptions.criteria.filter((t) => t.isPlayOnCriteria !== true).length > 0;
    return false;
  }, [tagOptions.criteria, isPlayOnSelected, isOffenceSelected]);

  const isComplete = showPanels &&
    value.restartTagId !== null &&
    value.sanctionTagId !== null &&
    (!criteriaRequired || value.criteriaTagIds.length > 0);

  if (!isOpen) return null;

  const setPlayOnNoOffence = () => {
    onChange({
      ...value,
      selectedOutcome: "play_on",
      playOnNoOffence: true,
      // Auto-fill restart and sanction; user can still change them in the panels
      restartTagId: playOnRestartTag?.id ?? null,
      sanctionTagId: noCardSanctionTag?.id ?? null,
      criteriaTagIds: [],
    });
  };

  const setOffence = () => {
    onChange({
      ...value,
      selectedOutcome: "offence",
      playOnNoOffence: false,
      // Clear auto-filled play-on values so the user selects offense-specific ones
      restartTagId: null,
      sanctionTagId: null,
      criteriaTagIds: [],
    });
  };

  const handleCriteriaToggle = (id: string) => {
    const already = value.criteriaTagIds.includes(id);
    onChange({
      ...value,
      criteriaTagIds: already
        ? value.criteriaTagIds.filter((c) => c !== id)
        : [...value.criteriaTagIds, id],
    });
  };

  // Border colour for the panels section
  const panelsBorderColor = isPlayOnSelected ? `${ANSWER_GREEN}40` : "rgba(0,232,248,0.25)";

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
        style={{ zIndex: 100100 }}
        onClick={onClose}
      />
      <div
        className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto"
        style={{ zIndex: 100110 }}
      >
        <div
          className={cn(
            "relative w-full max-w-6xl backdrop-blur-xl bg-gradient-to-br from-dark-900/95 to-dark-800/95",
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
          <div className="px-4 py-4 md:px-6 md:py-5">
            <div className="space-y-5">
              {/* Play On / Offense toggle */}
              <div className="rounded-xl border border-dark-600 bg-dark-800/60 p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={setPlayOnNoOffence}
                    className={cn(
                      "rounded-xl border p-4 text-left transition-all duration-200",
                      isPlayOnSelected
                        ? "shadow-lg"
                        : "border-dark-500 bg-dark-800/80 hover:bg-dark-700/90"
                    )}
                    style={isPlayOnSelected ? { borderColor: `${ANSWER_GREEN}99`, backgroundColor: `${ANSWER_GREEN}1a`, boxShadow: `0 10px 30px -12px ${ANSWER_GREEN}80` } : {}}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn("mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all", isPlayOnSelected ? "bg-dark-900/40" : "border-dark-400 bg-dark-700")}
                        style={isPlayOnSelected ? { borderColor: ANSWER_GREEN } : {}}
                      >
                        <span className={cn("h-2.5 w-2.5 rounded-full transition-all", isPlayOnSelected ? "" : "bg-transparent")} style={isPlayOnSelected ? { backgroundColor: ANSWER_GREEN } : {}} />
                      </div>
                      <p className="text-sm font-bold uppercase tracking-wide" style={{ color: ANSWER_GREEN }}>
                        Play on / No offense
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={setOffence}
                    className={cn(
                      "rounded-xl border p-4 text-left transition-all duration-200",
                      isOffenceSelected
                        ? "shadow-lg"
                        : "border-dark-500 bg-dark-800/80 hover:bg-dark-700/90"
                    )}
                    style={isOffenceSelected ? { borderColor: `${ANSWER_RED}99`, backgroundColor: `${ANSWER_RED}1a`, boxShadow: `0 10px 30px -12px ${ANSWER_RED}80` } : {}}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn("mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all", isOffenceSelected ? "bg-dark-900/40" : "border-dark-400 bg-dark-700")}
                        style={isOffenceSelected ? { borderColor: ANSWER_RED } : {}}
                      >
                        <span className={cn("h-2.5 w-2.5 rounded-full transition-all", isOffenceSelected ? "" : "bg-transparent")} style={isOffenceSelected ? { backgroundColor: ANSWER_RED } : {}} />
                      </div>
                      <p className="text-sm font-bold uppercase tracking-wide" style={{ color: ANSWER_RED }}>
                        Offense
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Restart / Sanction / Criteria panels — shown for both play on AND offense */}
              <div
                className={cn(
                  "transition-all duration-300 ease-out",
                  showPanels ? "max-h-[720px] opacity-100 overflow-visible" : "max-h-0 opacity-0 overflow-hidden"
                )}
              >
                {showPanels && (
                  <div
                    className="space-y-3 rounded-xl bg-dark-900/50 p-3 md:p-4"
                    style={{ border: `1px solid ${panelsBorderColor}` }}
                  >
                    {/* Auto-fill hint for play on */}
                    {isPlayOnSelected && (
                      <p className="text-[11px] text-text-muted text-center">
                        Restart and sanction are auto-filled.{" "}
                        <span style={{ color: ANSWER_GREEN }}>Select criteria below.</span>
                      </p>
                    )}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <OptionPanel
                        label="Restart"
                        color={CATEGORY_COLORS.restarts}
                        options={tagOptions.restarts}
                        selectedId={value.restartTagId}
                        onSelect={(id) => onChange({ ...value, restartTagId: id })}
                        disabled={isPlayOnSelected}
                      />
                      <OptionPanel
                        label="Sanction"
                        color={CATEGORY_COLORS.sanction}
                        options={tagOptions.sanction}
                        selectedId={value.sanctionTagId}
                        onSelect={(id) => onChange({ ...value, sanctionTagId: id })}
                        disabled={isPlayOnSelected}
                      />
                      <CriteriaPanel
                        color={CATEGORY_COLORS.criteria}
                        options={visibleCriteria}
                        selectedIds={value.criteriaTagIds}
                        onToggle={handleCriteriaToggle}
                        onClearAll={() => onChange({ ...value, criteriaTagIds: [] })}
                      />
                    </div>
                  </div>
                )}
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
