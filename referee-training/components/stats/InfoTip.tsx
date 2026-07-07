"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type InfoTipProps = {
  /** One short, plain sentence. Keep it brief. */
  text: string;
  className?: string;
};

type Coords = { top: number; left: number; placement: "top" | "bottom" };

const TOOLTIP_WIDTH = 208; // matches w-52
const GAP = 8;

/**
 * Small ⓘ icon that reveals a one-line explanation on hover or focus.
 *
 * The tooltip is rendered in a portal with fixed positioning and clamped to the
 * viewport, so it always sits above other content and can never be clipped by an
 * ancestor's overflow or stacking context. Keyboard accessible (focus toggles,
 * Escape closes).
 */
export function InfoTip({ text, className }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const update = () => {
      const el = btnRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const half = TOOLTIP_WIDTH / 2;
      const placement: "top" | "bottom" = rect.top > 110 ? "top" : "bottom";
      const left = Math.max(
        half + GAP,
        Math.min(window.innerWidth - half - GAP, rect.left + rect.width / 2)
      );
      const top = placement === "top" ? rect.top - GAP : rect.bottom + GAP;
      setCoords({ top, left, placement });
    };

    update();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span
      className={cn("relative inline-flex align-middle", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        ref={btnRef}
        type="button"
        aria-label={text}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="flex h-4 w-4 items-center justify-center rounded-full border border-text-muted/50 text-[9px] font-bold leading-none text-text-muted transition-colors hover:border-cyan-500 hover:text-cyan-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50"
      >
        i
      </button>
      {open &&
        coords &&
        typeof document !== "undefined" &&
        createPortal(
          <span
            role="tooltip"
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: TOOLTIP_WIDTH,
              transform:
                coords.placement === "top"
                  ? "translate(-50%, -100%)"
                  : "translate(-50%, 0)",
            }}
            className="pointer-events-none z-[9999] rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 text-[11px] font-normal leading-snug text-text-secondary shadow-elevated"
          >
            {text}
          </span>,
          document.body
        )}
    </span>
  );
}
