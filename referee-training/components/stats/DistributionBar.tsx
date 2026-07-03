"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { DISTRIBUTION_COLORS, DISTRIBUTION_LABELS } from "./score-utils";

type DistributionBarProps = {
  /** [correct, partial, incorrect] percentages */
  distribution: [number, number, number];
  className?: string;
  /** Height of the bar */
  size?: "sm" | "md" | "lg";
  showLabels?: boolean;
};

const SEGMENT_COLORS = [
  DISTRIBUTION_COLORS.correct,
  DISTRIBUTION_COLORS.partial,
  DISTRIBUTION_COLORS.incorrect,
];

/**
 * Stacked correct / partial / incorrect bar.
 * Segments grow in on first view, expand slightly on hover, and show a tooltip.
 */
export function DistributionBar({
  distribution,
  className,
  size = "md",
  showLabels = false,
}: DistributionBarProps) {
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const height = size === "sm" ? "h-2" : size === "lg" ? "h-5" : "h-3";

  return (
    <div ref={ref} className={cn("space-y-1.5", className)}>
      <div
        className={cn(
          "relative flex w-full overflow-hidden rounded-full bg-dark-900/60",
          height
        )}
      >
        {distribution.map((pct, i) => (
          <div
            key={i}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            className="relative h-full transition-all duration-700 ease-out first:rounded-l-full last:rounded-r-full"
            style={{
              width: visible ? `${pct}%` : "0%",
              backgroundColor: SEGMENT_COLORS[i],
              opacity: hovered === null ? 0.9 : hovered === i ? 1 : 0.35,
              transitionDelay: visible ? `${i * 120}ms` : "0ms",
            }}
          >
            {hovered === i && (
              <div className="pointer-events-none absolute -top-9 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md border border-dark-600 bg-dark-900 px-2 py-1 text-[11px] font-semibold text-text-primary shadow-elevated">
                {DISTRIBUTION_LABELS[i]}: {pct}%
              </div>
            )}
          </div>
        ))}
      </div>
      {showLabels && (
        <div className="flex justify-between text-[11px] font-medium">
          {distribution.map((pct, i) => (
            <span
              key={i}
              className="flex items-center gap-1 transition-opacity"
              style={{ opacity: hovered === null || hovered === i ? 1 : 0.4 }}
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: SEGMENT_COLORS[i] }}
              />
              <span className="text-text-secondary">{pct}%</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Small legend explaining the three segments. Reusable across stats views. */
export function DistributionLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-4 text-xs text-text-secondary", className)}>
      {DISTRIBUTION_LABELS.map((label, i) => (
        <span key={label} className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: SEGMENT_COLORS[i] }}
          />
          {label}
        </span>
      ))}
    </div>
  );
}
