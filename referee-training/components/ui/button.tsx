import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-dark-900 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-dark-900 rounded-lg shadow-glow hover:bg-accent-dark active:scale-[0.98]",
        secondary:
          "bg-dark-700 border border-accent/30 text-white rounded-lg hover:bg-dark-600 hover:border-accent/50 active:scale-[0.98]",
        outline:
          "border border-accent/40 text-accent rounded-lg bg-transparent hover:bg-accent/10 hover:border-accent/60 active:scale-[0.98]",
        ghost:
          "text-text-secondary bg-transparent hover:text-accent hover:bg-accent/5 rounded-lg active:scale-[0.98]",
        danger:
          "bg-red-900/20 border border-red-500/40 text-red-400 rounded-lg hover:bg-red-900/30 hover:border-red-500/60 active:scale-[0.98]",
      },
      size: {
        xs: "h-8 px-3 text-xs",
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-5 text-sm",
        lg: "h-12 px-6 text-base",
        xl: "h-14 px-8 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
