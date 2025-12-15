import Link from "next/link";

type Tab = {
  label: string;
  value: string;
  href: string;
};

export function TabNavigation({ tabs, activeTab }: { tabs: Tab[]; activeTab: string }) {
  return (
    <div className="flex gap-10 border-b border-accent/10">
      {tabs.map((tab) => {
        const isActive = tab.value === activeTab;
        return (
          <Link
            key={tab.value}
            href={tab.href}
            className="group relative py-2 text-sm font-medium transition-all duration-300 text-text-secondary hover:text-accent whitespace-nowrap"
          >
            <span className={isActive ? "text-accent" : ""}>
              {tab.label}
            </span>
            {/* Active underline with gradient */}
            <span 
              className={`absolute -bottom-[1px] left-0 right-0 h-[2px] rounded-full transition-all duration-300 ${
                isActive 
                  ? "bg-accent opacity-100" 
                  : "bg-accent/30 opacity-0 scale-x-0 group-hover:opacity-40 group-hover:scale-x-100"
              }`}
            />
          </Link>
        );
      })}
    </div>
  );
}
