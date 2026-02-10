"use client";

import { useEffect } from "react";
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
  tagOptions: {
    restarts: TagOption[];
    sanction: TagOption[];
    criteria: TagOption[];
  };
  value: VideoTestAnswerValue;
  onChange: (value: VideoTestAnswerValue) => void;
}

export function VideoTestAnswerOverlay({
  isOpen,
  onClose,
  tagOptions,
  value,
  onChange,
}: VideoTestAnswerOverlayProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Escape" || e.key === "i" || e.key === "I") && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const disabled = value.playOnNoOffence;

  const setPlayOnNoOffence = (v: boolean) => {
    onChange({
      ...value,
      playOnNoOffence: v,
      ...(v ? { restartTagId: null, sanctionTagId: null, criteriaTagIds: [] } : {}),
    });
  };

  return (
    <>
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300"
        style={{ zIndex: 100100 }}
        onClick={onClose}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4 overflow-y-auto" style={{ zIndex: 100110 }}>
        <div
          className={cn(
            "relative w-full max-w-3xl backdrop-blur-xl bg-gradient-to-br from-[#0F1419]/70 to-[#1E293B]/80",
            "rounded-lg shadow-2xl border-2 border-accent/50",
            "transform transition-all duration-300",
            "scale-100 opacity-100"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-8 pt-8 pb-4 border-b-4 border-accent/50">
            <h2 className="text-2xl font-bold uppercase tracking-wider text-center text-accent">
              Your answer
            </h2>
          </div>

          <div className="px-8 py-6 space-y-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={value.playOnNoOffence}
                onChange={(e) => setPlayOnNoOffence(e.target.checked)}
                className="w-5 h-5 rounded border-dark-500 bg-dark-700 text-accent focus:ring-accent"
              />
              <span className="text-white font-medium">Play on / No offence</span>
            </label>

            <div className={cn("grid grid-cols-3 gap-4", disabled && "opacity-50 pointer-events-none")}>
              <div className="bg-slate-800/20 backdrop-blur-sm rounded-lg p-4 border border-slate-700/30">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">
                  Restart
                </div>
                <select
                  value={value.restartTagId ?? ""}
                  onChange={(e) => onChange({ ...value, restartTagId: e.target.value || null })}
                  disabled={disabled}
                  className="w-full px-3 py-2 rounded-lg bg-dark-800 border border-dark-600 text-white text-sm focus:border-accent focus:ring-1 focus:ring-accent"
                >
                  <option value="">—</option>
                  {tagOptions.restarts.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="bg-slate-800/20 backdrop-blur-sm rounded-lg p-4 border border-slate-700/30">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">
                  Sanction
                </div>
                <select
                  value={value.sanctionTagId ?? ""}
                  onChange={(e) => onChange({ ...value, sanctionTagId: e.target.value || null })}
                  disabled={disabled}
                  className="w-full px-3 py-2 rounded-lg bg-dark-800 border border-dark-600 text-white text-sm focus:border-accent focus:ring-1 focus:ring-accent"
                >
                  <option value="">—</option>
                  {tagOptions.sanction.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="bg-slate-800/20 backdrop-blur-sm rounded-lg p-4 border border-slate-700/30">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">
                  Criteria
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {tagOptions.criteria.map((t) => {
                    const selected = value.criteriaTagIds.includes(t.id);
                    return (
                      <label key={t.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...value.criteriaTagIds, t.id]
                              : value.criteriaTagIds.filter((id) => id !== t.id);
                            onChange({ ...value, criteriaTagIds: next });
                          }}
                          disabled={disabled}
                          className="w-4 h-4 rounded border-dark-500 bg-dark-700 text-accent focus:ring-accent"
                        />
                        <span className="text-sm text-white">{t.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="px-8 py-6 border-t border-accent/20 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-accent hover:bg-accent/90 text-dark-900 font-semibold text-sm uppercase tracking-wide rounded-lg transition-colors"
            >
              Close (I)
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
