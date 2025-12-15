import * as React from "react";
import { cn } from "@/lib/utils";

type PillChipProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
};

export function PillChip({ active, className, children, ...props }: PillChipProps) {
  return (
    <button
      className={cn(
        "rounded-uefa-pill border px-4 py-2 text-sm font-semibold transition-colors",
        "bg-[rgba(1,5,100,0.35)] border-[rgba(255,255,255,0.06)] text-neutrals-textOnDarkPrimary",
        "hover:bg-[rgba(255,255,255,0.08)]",
        active &&
          "bg-[rgba(0,232,248,0.22)] border-[rgba(0,232,248,0.7)] text-uefa-cyan-primary",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

