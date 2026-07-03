import { cn } from "@/lib/utils";
import { scoreBgColor } from "./score-utils";

type ScoreBadgeProps = {
  score: number;
  decimals?: number;
  className?: string;
};

/** Colored average-mark pill (green ≥9, cyan ≥8, amber ≥7, red below). */
export function ScoreBadge({ score, decimals = 2, className }: ScoreBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-w-[52px] items-center justify-center rounded-full border px-2.5 py-0.5 text-sm font-bold tabular-nums transition-transform duration-150 group-hover:scale-105",
        scoreBgColor(score),
        className
      )}
    >
      {score.toFixed(decimals)}
    </span>
  );
}
