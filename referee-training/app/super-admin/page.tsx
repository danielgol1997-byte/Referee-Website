import { TabNavigation } from "@/components/admin/TabNavigation";
import { LawsAdminPanel } from "@/components/admin/laws/LawsAdminPanel";

const TABS = [
  { label: "Laws of the Game", value: "laws" },
  { label: "Referees Practice", value: "referee" },
  { label: "VAR Practice", value: "var" },
  { label: "AR Practice", value: "ar" },
  { label: "Library", value: "library" },
];

export default async function SuperAdminPage({ searchParams }: { searchParams?: Promise<{ tab?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const activeTab = TABS.some((tab) => tab.value === resolvedSearchParams?.tab) ? (resolvedSearchParams?.tab as string) : "laws";

  const tabsWithHref = TABS.map((tab) => ({
    ...tab,
    href: `/super-admin?tab=${tab.value}`,
  }));

  return (
    <div className="space-y-6">
      {/* Tab Navigation - Switch between different training areas */}
      <TabNavigation tabs={tabsWithHref} activeTab={activeTab} />

      {/* Content Area - Admin tools for the selected tab */}
      <div className="pt-2">
        {/* Laws of the Game - Manage text-based quiz questions */}
        {activeTab === "laws" && <LawsAdminPanel />}
        
        {/* Coming Soon: Referees Practice - Video scenarios */}
        {activeTab === "referee" && (
          <p className="text-sm text-text-secondary">
            Referees practice management will allow clip uploads, challenge configuration, and scoring rubrics.
          </p>
        )}
        
        {/* Coming Soon: VAR Practice */}
        {activeTab === "var" && (
          <p className="text-sm text-text-secondary">
            VAR practice management will handle incident clips, decision trees, and intervention thresholds.
          </p>
        )}
        
        {/* Coming Soon: AR Practice */}
        {activeTab === "ar" && (
          <p className="text-sm text-text-secondary">
            AR practice management will cover offside scenarios, positioning notes, and decisions.
          </p>
        )}
        
        {/* Coming Soon: Library */}
        {activeTab === "library" && (
          <p className="text-sm text-text-secondary">
            Library management will let you create and order articles, snippets, and reference material.
          </p>
        )}
      </div>
    </div>
  );
}
