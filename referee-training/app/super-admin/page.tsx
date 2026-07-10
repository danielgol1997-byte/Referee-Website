import { TabNavigation } from "@/components/admin/TabNavigation";
import { LawsAdminPanel } from "@/components/admin/laws/LawsAdminPanel";
import { VideoLibraryContent } from "@/components/admin/library/VideoLibraryContent";
import { UserManagementPanel } from "@/components/admin/users/UserManagementPanel";
import { VideoTestsAdminPanel } from "@/components/admin/video-tests/VideoTestsAdminPanel";
import { ArClipsAdminPanel } from "@/components/admin/ar/ArClipsAdminPanel";
import { FederationsPanel } from "@/components/admin/federations/FederationsPanel";

const TABS = [
  { label: "Laws of the Game", value: "laws" },
  { label: "Referee Practice", value: "referee" },
  { label: "VAR Practice", value: "var" },
  { label: "AR Practice", value: "ar" },
  { label: "Video Library", value: "library" },
  { label: "Federations", value: "federations" },
  { label: "Users", value: "users" },
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
        
        {/* Referee Practice - Create and manage video tests (mandatory, public) */}
        {activeTab === "referee" && <VideoTestsAdminPanel />}
        
        {/* Coming Soon: VAR Practice */}
        {activeTab === "var" && (
          <p className="text-sm text-text-secondary">
            VAR practice management will handle incident clips, decision trees, and intervention thresholds.
          </p>
        )}
        
        {/* AR Practice - Manage offside decision clips for the A.R. test */}
        {activeTab === "ar" && <ArClipsAdminPanel />}
        
        {/* Video Library Management */}
        {activeTab === "library" && <VideoLibraryContent />}

        {/* Federations - Build the association / rank hierarchy */}
        {activeTab === "federations" && <FederationsPanel />}

        {/* User Management */}
        {activeTab === "users" && <UserManagementPanel />}
      </div>
    </div>
  );
}
