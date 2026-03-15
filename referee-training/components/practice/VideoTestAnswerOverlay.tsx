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
const ANSWER_GREEN = "#22c55e";
const ANSWER_RED = "#ef4444";

/* ─── Always-visible searchable answer panel ─── */
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
    (id: string | null) => {
      onSelect(id);
    },
    [onSelect]
  );

  return (
    <div className="rounded-xl border p-3" style={{ borderColor: `${color}35`, backgroundColor: `${color}08` }}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-xs font-bold uppercase tracking-widest" style={{ color }}>
          {label}
        </div>
        {selectedTag && (
          <button
            type="button"
            onClick={() => handleSelect(null)}
            className="rounded-md px-2 py-1 text-[11px] font-semibold transition-colors hover:bg-dark-700/80"
            style={{ color }}
            title={`Clear ${label.toLowerCase()}`}
          >
            Clear
          </button>
        )}
      </div>

      <div className="relative mb-2">
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
          style={{ color: `${color}80` }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
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
        <div className="py-3 text-center text-xs text-text-secondary">
          No matches
        </div>
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
                className={cn(
                  "rounded-lg border px-2.5 py-2 text-left text-xs font-medium leading-snug transition-all",
                  disabled && "opacity-50 cursor-not-allowed",
                  isSelected ? "shadow-md" : "hover:bg-dark-700/70"
                )}
                style={
                  isSelected
                    ? {
                        borderColor: `${color}b3`,
                        backgroundColor: `${color}20`,
                        color,
                        boxShadow: `0 8px 20px -12px ${color}`,
                      }
                    : {
                        borderColor: `${color}35`,
                        color: "#f5f8ff",
                      }
                }
              >
                <span className="line-clamp-2">{tag.name}</span>
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
  if (!isOpen) return null;

  const selectedOutcome = value.selectedOutcome
    ?? (value.playOnNoOffence
      ? "play_on"
      : value.restartTagId !== null || value.sanctionTagId !== null || value.criteriaTagIds.length > 0
        ? "offence"
        : null);
  const isPlayOnSelected = selectedOutcome === "play_on";
  const isOffenceSelected = selectedOutcome === "offence";
  const isComplete = isPlayOnSelected ||
    (isOffenceSelected && value.restartTagId !== null && value.sanctionTagId !== null && value.criteriaTagIds.length > 0);

  const setPlayOnNoOffence = () => {
    onChange({
      ...value,
      selectedOutcome: "play_on",
      playOnNoOffence: true,
      restartTagId: null,
      sanctionTagId: null,
      criteriaTagIds: [],
    });
  };

  const setOffence = () => {
    onChange({
      ...value,
      selectedOutcome: "offence",
      playOnNoOffence: false,
    });
  };

  const criteriaTagId = value.criteriaTagIds[0] ?? null;

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
                    style={isPlayOnSelected ? { borderColor: `${ANSWER_GREEN}99`, backgroundColor: `${ANSWER_GREEN}1a`, boxShadow: `0 10px 30px -12px ${ANSWER_GREEN}80` } : { borderColor: undefined }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all",
                        isPlayOnSelected ? "bg-dark-900/40" : "border-dark-400 bg-dark-700"
                      )}
                      style={isPlayOnSelected ? { borderColor: ANSWER_GREEN } : {}}
                      >
                        <span className={cn("h-2.5 w-2.5 rounded-full transition-all", isPlayOnSelected ? "" : "bg-transparent")} style={isPlayOnSelected ? { backgroundColor: ANSWER_GREEN } : {}} />
                      </div>
                      <div>
                        <p className="text-sm font-bold uppercase tracking-wide" style={{ color: ANSWER_GREEN }}>
                          Play on / No offense
                        </p>
                      </div>
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
                    style={isOffenceSelected ? { borderColor: `${ANSWER_RED}99`, backgroundColor: `${ANSWER_RED}1a`, boxShadow: `0 10px 30px -12px ${ANSWER_RED}80` } : { borderColor: undefined }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all",
                        isOffenceSelected ? "bg-dark-900/40" : "border-dark-400 bg-dark-700"
                      )}
                      style={isOffenceSelected ? { borderColor: ANSWER_RED } : {}}
                      >
                        <span className={cn("h-2.5 w-2.5 rounded-full transition-all", isOffenceSelected ? "" : "bg-transparent")} style={isOffenceSelected ? { backgroundColor: ANSWER_RED } : {}} />
                      </div>
                      <div>
                        <p className="text-sm font-bold uppercase tracking-wide" style={{ color: ANSWER_RED }}>
                          Offense
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div
                className={cn(
                  "transition-all duration-300 ease-out",
                  isOffenceSelected ? "max-h-[720px] opacity-100 overflow-visible" : "max-h-0 opacity-0 overflow-hidden"
                )}
              >
                {isOffenceSelected && (
                  <div className="space-y-3 rounded-xl border border-accent/25 bg-dark-900/50 p-3 md:p-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <OptionPanel
                        label="Restart"
                        color={CATEGORY_COLORS.restarts}
                        options={tagOptions.restarts}
                        selectedId={value.restartTagId}
                        onSelect={(id) => onChange({ ...value, selectedOutcome: "offence", playOnNoOffence: false, restartTagId: id })}
                        disabled={!isOffenceSelected}
                      />
                      <OptionPanel
                        label="Sanction"
                        color={CATEGORY_COLORS.sanction}
                        options={tagOptions.sanction}
                        selectedId={value.sanctionTagId}
                        onSelect={(id) => onChange({ ...value, selectedOutcome: "offence", playOnNoOffence: false, sanctionTagId: id })}
                        disabled={!isOffenceSelected}
                      />
                      <OptionPanel
                        label="Criteria"
                        color={CATEGORY_COLORS.criteria}
                        options={tagOptions.criteria}
                        selectedId={criteriaTagId}
                        onSelect={(id) => onChange({ ...value, selectedOutcome: "offence", playOnNoOffence: false, criteriaTagIds: id ? [id] : [] })}
                        disabled={!isOffenceSelected}
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
