"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  EXPECTED_INDEX,
  MATCH_SCALE_BANDS,
  VAR_SCALE_BANDS,
} from "@/lib/performance-index";
import { RATING_META } from "@/lib/observer-reports-mock";

/**
 * Small eye button that opens a concise explanation of how UEFA observer
 * grading works (per the 2026 referee convention & observer guidelines) and how
 * we normalise match marks against platform tests. Keeps the report cards free
 * of inline jargon.
 */
export function GradingGuide({ label = "How grading works" }: { label?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label="How grading works"
          className="inline-flex items-center gap-1.5 rounded-full border border-dark-600 bg-dark-800/70 px-2.5 py-1 text-[11px] font-semibold text-text-secondary transition-all hover:border-cyan-500/50 hover:text-cyan-400"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.5 12S5.5 5.5 12 5.5 21.5 12 21.5 12 18.5 18.5 12 18.5 2.5 12 2.5 12z"
            />
            <circle cx="12" cy="12" r="2.6" strokeWidth={2} />
          </svg>
          {label}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in duration-200" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[9999] flex max-h-[86vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-dark-600 bg-dark-800 shadow-2xl shadow-black/50 data-[state=open]:animate-in data-[state=open]:zoom-in-95 duration-200 focus:outline-none">
          <div className="flex items-start justify-between gap-4 border-b border-dark-600 px-6 py-4">
            <div>
              <Dialog.Title className="text-lg font-bold text-premium">
                How UEFA grading works
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-text-secondary">
                The observer marking system used across UEFA competitions (2026).
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="rounded-lg border border-dark-600 p-1.5 text-text-muted transition-colors hover:text-text-primary"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </Dialog.Close>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
            {/* Mark scale */}
            <section>
              <h3 className="text-sm font-semibold text-text-primary">The mark scale</h3>
              <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                Referees are marked on a compressed scale where <b className="text-cyan-400">8.4 is
                the benchmark</b> — a good performance at the expected level. Tenths matter: a single
                clear mistake caps the mark at 7.9.
              </p>
              <ul className="mt-3 divide-y divide-dark-700 overflow-hidden rounded-lg border border-dark-600">
                {MATCH_SCALE_BANDS.map((b) => (
                  <li
                    key={b.range}
                    className={`flex items-center gap-3 px-3 py-1.5 text-xs ${
                      b.benchmark ? "bg-cyan-500/10" : "bg-dark-900/40"
                    }`}
                  >
                    <span
                      className={`w-16 shrink-0 font-bold tabular-nums ${
                        b.benchmark ? "text-cyan-400" : "text-text-primary"
                      }`}
                    >
                      {b.range}
                    </span>
                    <span className="text-text-secondary">{b.label}</span>
                    {b.benchmark && (
                      <span className="ml-auto shrink-0 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-400">
                        Benchmark
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            {/* Difficulty */}
            <section>
              <h3 className="text-sm font-semibold text-text-primary">Level of difficulty</h3>
              <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                Baked into the mark — a tougher match handled well can earn a higher mark than an
                easy one.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {["Normal", "Quite challenging", "Very challenging"].map((d, i) => (
                  <span
                    key={d}
                    className="rounded-full border border-dark-600 bg-dark-900/40 px-2.5 py-1 text-[11px] text-text-secondary"
                  >
                    <span className="mr-1 text-text-muted">{i + 1}.</span>
                    {d}
                  </span>
                ))}
              </div>
            </section>

            {/* + / Expected / − */}
            <section>
              <h3 className="text-sm font-semibold text-text-primary">Section ratings</h3>
              <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                Within each of the six sections, every sub-criterion is rated relative to the
                expected standard:
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(["plus", "expected", "minus"] as const).map((r) => (
                  <span
                    key={r}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${RATING_META[r].class}`}
                  >
                    <span className="font-bold">{RATING_META[r].symbol}</span>
                    {RATING_META[r].label}
                  </span>
                ))}
              </div>
            </section>

            {/* VAR scale */}
            <section>
              <h3 className="text-sm font-semibold text-text-primary">VAR scale</h3>
              <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                The Video Assistant Referee is graded on a separate integer scale where{" "}
                <b className="text-cyan-400">7 is the benchmark</b> (efficient, no obvious
                involvement).
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {VAR_SCALE_BANDS.map((b) => (
                  <span
                    key={b.range}
                    title={b.label}
                    className={`rounded-md border px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                      b.benchmark
                        ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-400"
                        : "border-dark-600 bg-dark-900/40 text-text-secondary"
                    }`}
                  >
                    {b.range}
                  </span>
                ))}
              </div>
            </section>

            {/* Performance Index */}
            <section className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.04] p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                <span className="text-cyan-400">✦</span>
                Comparing tests vs matches — the Performance Index
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">
                Platform test marks (0–10) and UEFA match marks aren&apos;t the same scale — a test
                8.4 and a match 8.4 mean different things. So both are converted to one{" "}
                <b className="text-text-primary">Performance Index (0–100)</b> anchored so that{" "}
                <b className="text-cyan-400">{EXPECTED_INDEX} = the expected standard</b> on either
                scale. Above {EXPECTED_INDEX} is above expectation; below it needs development. That
                makes the gap between a referee&apos;s <i>theory</i> (tests) and their{" "}
                <i>pitch application</i> (match marks) directly comparable.
              </p>
            </section>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
