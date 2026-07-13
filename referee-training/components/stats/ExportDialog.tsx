"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { STAT_CATEGORIES, type StatReferee } from "@/lib/stats-mock";
import { runExport, type ExportFormat } from "@/lib/stats-export";
import { COUNTRY_FLAGS } from "@/lib/stats-mock";

const FORMATS: { value: ExportFormat; label: string; hint: string }[] = [
  { value: "csv", label: "CSV", hint: "Plain data, opens anywhere" },
  { value: "excel", label: "Excel", hint: "Colour-coded .xlsx workbook" },
  { value: "pdf", label: "PDF", hint: "Presentation-ready report" },
];

function Checkbox({
  checked,
  onChange,
  label,
  sub,
}: {
  checked: boolean;
  onChange: () => void;
  label: React.ReactNode;
  sub?: string;
}) {
  return (
    <label className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-dark-700/60 cursor-pointer">
      <span
        onClick={(e) => {
          e.preventDefault();
          onChange();
        }}
        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border transition-colors ${
          checked
            ? "border-cyan-500 bg-cyan-500 text-dark-900"
            : "border-dark-500 bg-dark-900"
        }`}
      >
        {checked && (
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>
      <span className="flex-1 text-sm text-text-primary">
        {label}
        {sub && <span className="ml-1.5 text-xs text-text-muted">{sub}</span>}
      </span>
    </label>
  );
}

function ExportDialogBody({
  role,
  referees,
  scopeLabel,
  onClose,
}: {
  role: "ADMIN" | "SUPER_ADMIN" | "REFEREE";
  referees: StatReferee[];
  scopeLabel?: string | null;
  onClose: () => void;
}) {
  const [refereeIds, setRefereeIds] = useState<Set<string>>(new Set(referees.map((r) => r.id)));
  const [categorySlugs, setCategorySlugs] = useState<Set<string>>(
    new Set(STAT_CATEGORIES.map((c) => c.slug))
  );
  const [format, setFormat] = useState<ExportFormat>("excel");
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setRefereeIds(new Set(referees.map((r) => r.id)));
  }, [referees]);

  const toggleReferee = (id: string) =>
    setRefereeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleCategory = (slug: string) =>
    setCategorySlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });

  const allRefereesSelected = refereeIds.size === referees.length;
  const allCategoriesSelected = categorySlugs.size === STAT_CATEGORIES.length;

  const selectedReferees = referees.filter((r) => refereeIds.has(r.id));
  const selectedCategories = STAT_CATEGORIES.filter((c) => categorySlugs.has(c.slug));

  const handleExport = async () => {
    if (selectedReferees.length === 0 || selectedCategories.length === 0) return;
    setExporting(true);
    try {
      await runExport(
        format,
        selectedReferees,
        selectedCategories,
        scopeLabel || "All referees"
      );
      setDone(true);
      setTimeout(() => {
        setDone(false);
        onClose();
      }, 900);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex max-h-[85vh] flex-col">
      <div className="border-b border-dark-600 px-6 py-4">
        <Dialog.Title className="text-lg font-bold text-premium">Export statistics</Dialog.Title>
        <Dialog.Description className="mt-1 text-sm text-text-secondary">
          {role === "REFEREE"
            ? "Download your own statistics."
            : `Scope: ${scopeLabel || "all referees currently in view"}. Fine-tune what's included below.`}
        </Dialog.Description>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
        {role !== "REFEREE" && referees.length > 1 && (
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Referees ({refereeIds.size} of {referees.length})
              </p>
              <button
                type="button"
                onClick={() =>
                  setRefereeIds(allRefereesSelected ? new Set() : new Set(referees.map((r) => r.id)))
                }
                className="text-xs font-medium text-cyan-500 hover:text-cyan-400"
              >
                {allRefereesSelected ? "Deselect all" : "Select all"}
              </button>
            </div>
            <div className="grid max-h-40 grid-cols-1 gap-0.5 overflow-y-auto rounded-lg border border-dark-600 bg-dark-900/40 p-1.5 sm:grid-cols-2">
              {referees.map((r) => (
                <Checkbox
                  key={r.id}
                  checked={refereeIds.has(r.id)}
                  onChange={() => toggleReferee(r.id)}
                  label={
                    <>
                      {COUNTRY_FLAGS[r.country] ?? ""} {r.name}
                    </>
                  }
                  sub={r.level}
                />
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Categories ({categorySlugs.size} of {STAT_CATEGORIES.length})
            </p>
            <button
              type="button"
              onClick={() =>
                setCategorySlugs(
                  allCategoriesSelected ? new Set() : new Set(STAT_CATEGORIES.map((c) => c.slug))
                )
              }
              className="text-xs font-medium text-cyan-500 hover:text-cyan-400"
            >
              {allCategoriesSelected ? "Deselect all" : "Select all"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-0.5 rounded-lg border border-dark-600 bg-dark-900/40 p-1.5 sm:grid-cols-3">
            {STAT_CATEGORIES.map((c) => (
              <Checkbox
                key={c.slug}
                checked={categorySlugs.has(c.slug)}
                onChange={() => toggleCategory(c.slug)}
                label={c.name}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted">
            Format
          </p>
          <div className="grid grid-cols-3 gap-2">
            {FORMATS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFormat(f.value)}
                className={`rounded-lg border px-3 py-2.5 text-left transition-all ${
                  format === f.value
                    ? "border-cyan-500 bg-cyan-500/10"
                    : "border-dark-600 bg-dark-900/40 hover:border-dark-500"
                }`}
              >
                <p
                  className={`text-sm font-bold ${format === f.value ? "text-cyan-400" : "text-text-primary"}`}
                >
                  {f.label}
                </p>
                <p className="mt-0.5 text-[11px] text-text-muted">{f.hint}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-dark-600 px-6 py-4">
        <Dialog.Close asChild>
          <Button variant="ghost" size="sm">
            Cancel
          </Button>
        </Dialog.Close>
        <Button
          size="sm"
          onClick={handleExport}
          disabled={exporting || selectedReferees.length === 0 || selectedCategories.length === 0}
          className="gap-1.5"
        >
          {done ? (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Downloaded
            </>
          ) : exporting ? (
            "Generating…"
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"
                />
              </svg>
              Export
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export function ExportButton({
  role,
  referees,
  scopeLabel,
}: {
  role: "ADMIN" | "SUPER_ADMIN" | "REFEREE";
  referees: StatReferee[];
  scopeLabel?: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3.5 py-2 text-xs font-semibold text-cyan-400 transition-all hover:bg-cyan-500/20"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"
            />
          </svg>
          Export
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in duration-200" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[9999] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-dark-600 bg-dark-800 shadow-2xl shadow-black/50 data-[state=open]:animate-in data-[state=open]:zoom-in-95 duration-200 focus:outline-none">
          {open && (
            <ExportDialogBody
              role={role}
              referees={referees}
              scopeLabel={scopeLabel}
              onClose={() => setOpen(false)}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
