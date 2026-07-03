"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type SparklineProps = {
  values: number[];
  min?: number;
  max?: number;
  className?: string;
  stroke?: string;
  height?: number;
};

/** Compact inline trend line with draw-in animation. */
export function Sparkline({
  values,
  min = 5,
  max = 10,
  className,
  stroke = "#00E8F8",
  height = 32,
}: SparklineProps) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<SVGSVGElement>(null);

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

  const width = 100;
  const pad = 3;
  const range = max - min || 1;
  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (v - min) / range) * (height - pad * 2);
    return [x, y] as const;
  });
  const path = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

  const last = points[points.length - 1];
  const rising = values[values.length - 1] >= values[0];

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      style={{ height, width: "100%" }}
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 300,
          strokeDashoffset: visible ? 0 : 300,
          transition: "stroke-dashoffset 1.1s ease-out",
        }}
      />
      {last && (
        <circle
          cx={last[0]}
          cy={last[1]}
          r={2.4}
          fill={rising ? "#22c55e" : "#ef4444"}
          style={{
            opacity: visible ? 1 : 0,
            transition: "opacity 0.4s ease-out 0.9s",
          }}
        />
      )}
    </svg>
  );
}
