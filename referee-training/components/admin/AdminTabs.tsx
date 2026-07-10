"use client";

import { ReactNode, useCallback, useEffect, useState } from "react";

type Tab = {
  label: string;
  value: string;
};

/**
 * Client-side tab shell for the admin panels. Switching tabs swaps panels
 * instantly (no server round-trip) while keeping the ?tab= URL in sync via
 * the History API. Visited panels stay mounted so switching back doesn't
 * refetch their data.
 */
export function AdminTabs({
  basePath,
  tabs,
  initialTab,
  panels,
}: {
  basePath: string;
  tabs: Tab[];
  initialTab: string;
  panels: Record<string, ReactNode>;
}) {
  const [active, setActive] = useState(initialTab);
  const [visited, setVisited] = useState<Set<string>>(() => new Set([initialTab]));

  const activate = useCallback((value: string) => {
    setActive(value);
    setVisited((prev) => (prev.has(value) ? prev : new Set(prev).add(value)));
  }, []);

  // Keep the active tab in sync with browser back/forward navigation.
  useEffect(() => {
    const onPop = () => {
      const tab = new URLSearchParams(window.location.search).get("tab");
      activate(tab && tabs.some((t) => t.value === tab) ? tab : initialTab);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [tabs, initialTab, activate]);

  const onSelect = (value: string) => {
    if (value === active) return;
    activate(value);
    window.history.pushState(null, "", `${basePath}?tab=${value}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-10 overflow-x-auto border-b border-accent/10">
        {tabs.map((tab) => {
          const isActive = tab.value === active;
          return (
            <a
              key={tab.value}
              href={`${basePath}?tab=${tab.value}`}
              onClick={(e) => {
                // Preserve open-in-new-tab and other modified clicks.
                if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
                  return;
                }
                e.preventDefault();
                onSelect(tab.value);
              }}
              className="group relative whitespace-nowrap py-2 text-sm font-medium text-text-secondary transition-all duration-300 hover:text-accent"
            >
              <span className={isActive ? "text-accent" : ""}>{tab.label}</span>
              <span
                className={`absolute -bottom-[1px] left-0 right-0 h-[2px] rounded-full transition-all duration-300 ${
                  isActive
                    ? "bg-accent opacity-100"
                    : "bg-accent/30 opacity-0 scale-x-0 group-hover:opacity-40 group-hover:scale-x-100"
                }`}
              />
            </a>
          );
        })}
      </div>

      <div className="pt-2">
        {tabs.map((tab) =>
          visited.has(tab.value) ? (
            <div key={tab.value} hidden={tab.value !== active}>
              {panels[tab.value]}
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}
