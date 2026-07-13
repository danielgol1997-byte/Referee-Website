import { StatsFiltersProvider } from "@/lib/stats-filters-context";

export default function StatsLayout({ children }: { children: React.ReactNode }) {
  return <StatsFiltersProvider>{children}</StatsFiltersProvider>;
}
