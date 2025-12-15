"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DropdownMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
}

export function DropdownMenu({ trigger, children, align = "right" }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const menuContentRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLDivElement>(null);

  const closeMenu = React.useCallback(() => {
    setIsOpen(false);
    // Remove focus from trigger to prevent yellow outline flash
    if (triggerRef.current) {
      const focusableElement = triggerRef.current.querySelector('button, a, [tabindex]') as HTMLElement;
      if (focusableElement && document.activeElement === focusableElement) {
        focusableElement.blur();
      }
    }
    // Also blur any active element to prevent focus flash
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, []);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    const handleMenuClick = (event: MouseEvent) => {
      // Check if the clicked element is a link, button, or inside a link
      const target = event.target as HTMLElement;
      const link = target.closest('a');
      const button = target.closest('button');
      // Close menu when clicking on links or buttons (menu items)
      if (link || button) {
        // Immediately blur any focused elements to prevent yellow outline flash
        if (document.activeElement instanceof HTMLElement) {
          (document.activeElement as HTMLElement).blur();
        }
        // Close menu after a small delay to allow onClick handlers to execute
        setTimeout(() => {
          closeMenu();
        }, 100);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
      // Listen for clicks on interactive elements inside the menu
      menuContentRef.current?.addEventListener("click", handleMenuClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      menuContentRef.current?.removeEventListener("click", handleMenuClick);
    };
  }, [isOpen, closeMenu]);

  return (
    <div className="relative" ref={dropdownRef}>
      <div 
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)} 
        className="cursor-pointer"
        onMouseDown={(e) => {
          // Prevent focus on trigger when clicking with mouse
          // This prevents the yellow outline flash while preserving keyboard navigation
          if (e.button === 0) { // Left mouse button
            e.preventDefault();
          }
        }}
      >
        {trigger}
      </div>
      
      {isOpen && (
        <div
          className={cn(
            "absolute top-full mt-2 z-50 min-w-[200px] rounded-lg border border-dark-600 bg-dark-800 shadow-elevated animate-in fade-in-0 zoom-in-95",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          <div className="p-1" ref={menuContentRef}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

interface DropdownMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  children: React.ReactNode;
  variant?: "default" | "danger";
}

export function DropdownMenuItem({ 
  icon, 
  children, 
  variant = "default",
  className,
  ...props 
}: DropdownMenuItemProps) {
  return (
    <button
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
        variant === "default" && "text-text-secondary hover:text-text-primary hover:bg-dark-700",
        variant === "danger" && "text-status-danger hover:bg-status-dangerBg",
        className
      )}
      {...props}
    >
      {icon && <span className="w-4 h-4 flex items-center justify-center">{icon}</span>}
      {children}
    </button>
  );
}

interface DropdownMenuSeparatorProps {
  className?: string;
}

export function DropdownMenuSeparator({ className }: DropdownMenuSeparatorProps) {
  return <div className={cn("my-1 h-px bg-dark-600", className)} />;
}

interface DropdownMenuLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function DropdownMenuLabel({ children, className }: DropdownMenuLabelProps) {
  return (
    <div className={cn("px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider", className)}>
      {children}
    </div>
  );
}
