import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const cardVariants = cva("relative overflow-hidden transition-all duration-200", {
  variants: {
    variant: {
      default:
        "bg-gradient-to-b from-dark-700 to-dark-800 border border-dark-600 rounded-xl shadow-card",
      elevated:
        "bg-dark-700 border border-dark-500 rounded-xl shadow-elevated",
      ghost:
        "bg-dark-800/50 border border-dark-600 rounded-xl",
      glass:
        "glass border border-dark-600/50 rounded-xl",
      accent:
        "bg-gradient-to-b from-dark-700 to-dark-800 border border-cyan-500/30 rounded-xl shadow-glow",
    },
    padded: {
      true: "p-6",
      false: "",
    },
    hoverable: {
      true: "hover:border-cyan-500/30 hover:shadow-glow cursor-pointer",
      false: "",
    },
  },
  defaultVariants: {
    variant: "default",
    padded: true,
    hoverable: false,
  },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padded, hoverable, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, padded, hoverable }), className)}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";

// Card Header
export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 pb-4", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

// Card Title
export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-lg font-semibold text-text-primary", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

// Card Description
export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-text-secondary", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

// Card Content
export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("", className)} {...props} />
));
CardContent.displayName = "CardContent";

// Card Footer
export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center pt-4 border-t border-dark-600", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";
