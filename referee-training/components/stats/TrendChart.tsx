"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type TrendPoint = {
  label: string;
  value: number;
};

type TrendChartProps = {
  points: TrendPoint[];
  min?: number;
  max?: number;
  stroke?: string;
  className?: string;
  valueFormatter?: (value: number) => string;
};

/**
 * Full-size line chart with grid lines, hoverable data points, and draw-in animation.
 * Pure SVG — no chart library needed for the mock-up.
 */
export function TrendChart({
  points,
  min = 5,
  max = 10,
  stroke = "#00E8F8",
  className,
  valueFormatter = (v) => v.toFixed(1),
}: TrendChartProps) {
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
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const width = 600;
  const height = 220;
  const padX = 36;
  const padY = 24;
  const range = max - min || 1;

  const coords = useMemo(
    () =>
      points.map((p, i) => {
        const x = padX + (i / Math.max(points.length - 1, 1)) * (width - padX * 2);
        const y = padY + (1 - (p.value - min) / range) * (height - padY * 2);
        return { x, y, ...p };
      }),
    [points, min, range]
  );

  const linePath = coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L${coords[coords.length - 1]?.x.toFixed(1)},${height - padY} L${coords[0]?.x.toFixed(1)},${height - padY} Z`;

  const gridValues = [];
  for (let v = min; v <= max; v++) gridValues.push(v);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img">
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.25} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>

        {gridValues.map((v) => {
          const y = padY + (1 - (v - min) / range) * (height - padY * 2);
          return (
            <g key={v}>
              <line
                x1={padX}
                x2={width - padX}
                y1={y}
                y2={y}
                stroke="#576779"
                strokeOpacity={0.3}
                strokeDasharray="4 4"
              />
              <text x={padX - 8} y={y + 3.5} textAnchor="end" fontSize={10} fill="#D0DAE6">
                {v}
              </text>
            </g>
          );
        })}

        <path
          d={areaPath}
          fill="url(#trendFill)"
          style={{ opacity: visible ? 1 : 0, transition: "opacity 0.8s ease-out 0.6s" }}
        />
        <path
          d={linePath}
          fill="none"
          stroke={stroke}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 1400,
            strokeDashoffset: visible ? 0 : 1400,
            transition: "stroke-dashoffset 1.4s ease-out",
          }}
        />

        {coords.map((c, i) => (
          <g key={i}>
            {/* invisible wide hit area */}
            <rect
              x={c.x - 14}
              y={padY}
              width={28}
              height={height - padY * 2}
              fill="transparent"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: "pointer" }}
            />
            <circle
              cx={c.x}
              cy={c.y}
              r={hovered === i ? 6 : 3.5}
              fill={hovered === i ? stroke : "#3D4C5E"}
              stroke={stroke}
              strokeWidth={2}
              style={{
                opacity: visible ? 1 : 0,
                transition: `opacity 0.3s ease-out ${0.1 * i + 0.5}s, r 0.15s ease-out`,
                pointerEvents: "none",
              }}
            />
            <text
              x={c.x}
              y={height - padY + 16}
              textAnchor="middle"
              fontSize={9.5}
              fill={hovered === i ? "#FFFFFF" : "#D0DAE6"}
              style={{ pointerEvents: "none" }}
            >
              {c.label}
            </text>
          </g>
        ))}
      </svg>

      {hovered !== null && coords[hovered] && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-lg border border-dark-600 bg-dark-900 px-3 py-1.5 text-xs shadow-elevated"
          style={{
            left: `${(coords[hovered].x / width) * 100}%`,
            top: `${(coords[hovered].y / height) * 100}%`,
            marginTop: -10,
          }}
        >
          <p className="font-semibold text-text-primary">{valueFormatter(coords[hovered].value)}</p>
          <p className="text-text-muted">{coords[hovered].label}</p>
        </div>
      )}
    </div>
  );
}
