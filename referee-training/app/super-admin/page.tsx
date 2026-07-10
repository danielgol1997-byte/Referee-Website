import { AdminTabs } from "@/components/admin/AdminTabs";
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

  return (
    <AdminTabs
      basePath="/super-admin"
      tabs={TABS}
      initialTab={activeTab}
      panels={{
        laws: <LawsAdminPanel />,
        referee: <VideoTestsAdminPanel />,
        var: (
          <p className="text-sm text-text-secondary">
            VAR practice management will handle incident clips, decision trees, and intervention thresholds.
          </p>
        ),
        ar: <ArClipsAdminPanel />,
        library: <VideoLibraryContent />,
        federations: <FederationsPanel />,
        users: <UserManagementPanel />,
      }}
    />
  );
}
