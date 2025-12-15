import * as React from "react";
import { cn } from "@/lib/utils";

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "md" | "lg";
}

export function IconButton({
  className,
  size = "md",
  children,
  ...props
}: IconButtonProps) {
  const dimension = size === "lg" ? "h-11 w-11" : "h-10 w-10";
  return (
    <button
      className={cn(
        "flex items-center justify-center rounded-full border border-[rgba(0,232,248,0.45)] text-uefa-cyan-primary bg-transparent hover:bg-[rgba(0,232,248,0.10)] transition-colors",
        dimension,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

