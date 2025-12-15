import * as React from "react";
import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
  accent?: boolean;
};

export function SectionHeader({ title, subtitle, actions, className, accent }: SectionHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div>
        {accent && (
          <div className="w-12 h-1 bg-gradient-to-r from-warm to-cyan-500 rounded-full mb-3" />
        )}
        <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
        {subtitle ? (
          <p className="text-sm text-text-secondary mt-1">{subtitle}</p>
        ) : null}
      </div>
      {actions}
    </div>
  );
}
