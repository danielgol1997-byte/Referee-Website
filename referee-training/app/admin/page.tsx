import { TabNavigation } from "@/components/admin/TabNavigation";
import { LawsAdminPanel } from "@/components/admin/laws/LawsAdminPanel";
import { VideoTestsAdminPanel } from "@/components/admin/video-tests/VideoTestsAdminPanel";
import { VideoLibraryContent } from "@/components/admin/library/VideoLibraryContent";
import { RefereesPanel } from "@/components/admin/referees/RefereesPanel";

const TABS = [
  { label: "Referees", value: "referees" },
  { label: "Laws of the Game", value: "laws" },
  { label: "Referee Practice", value: "referee" },
  { label: "Video Library", value: "library" },
  { label: "Stats", value: "stats" },
];

export default async function AdminPage({ searchParams }: { searchParams?: Promise<{ tab?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const activeTab = TABS.some((tab) => tab.value === resolvedSearchParams?.tab)
    ? (resolvedSearchParams?.tab as string)
    : "referees";

  const tabsWithHref = TABS.map((tab) => ({
    ...tab,
    href: `/admin?tab=${tab.value}`,
  }));

  return (
    <div className="space-y-6">
      <TabNavigation tabs={tabsWithHref} activeTab={activeTab} />

      <div className="pt-2">
        {/* Referees — assign ranks and international panels within your FA */}
        {activeTab === "referees" && <RefereesPanel />}

        {/* Laws of the Game — questions + laws tests (scoped to your FA + global) */}
        {activeTab === "laws" && <LawsAdminPanel />}

        {/* Referee Practice — video tests (scoped to your FA + global) */}
        {activeTab === "referee" && <VideoTestsAdminPanel />}

        {/* Video Library — your FA's videos + global; taxonomy stays global */}
        {activeTab === "library" && <VideoLibraryContent canManageTaxonomy={false} />}

        {activeTab === "stats" && (
          <p className="text-sm text-text-secondary">
            Federation stats are coming soon. You&rsquo;ll see performance for your referees here.
          </p>
        )}
      </div>
    </div>
  );
}
