/** Shared score→color mapping for the stats mock-up. */

export function scoreTextColor(score: number): string {
  if (score >= 9) return "text-[#4ade80]";
  if (score >= 8) return "text-cyan-500";
  if (score >= 7) return "text-[#fbbf24]";
  return "text-[#f87171]";
}

export function scoreBgColor(score: number): string {
  if (score >= 9) return "bg-[#22c55e]/15 text-[#4ade80] border-[#22c55e]/30";
  if (score >= 8) return "bg-cyan-500/15 text-cyan-500 border-cyan-500/30";
  if (score >= 7) return "bg-[#f59e0b]/15 text-[#fbbf24] border-[#f59e0b]/30";
  return "bg-[#ef4444]/15 text-[#f87171] border-[#ef4444]/30";
}

export const DISTRIBUTION_COLORS = {
  correct: "#22c55e",
  partial: "#f59e0b",
  incorrect: "#ef4444",
} as const;

export const DISTRIBUTION_LABELS = ["Correct", "Partially correct", "Incorrect"] as const;
