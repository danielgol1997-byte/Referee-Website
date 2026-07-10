import { AdminTabs } from "@/components/admin/AdminTabs";
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

  return (
    <AdminTabs
      basePath="/admin"
      tabs={TABS}
      initialTab={activeTab}
      panels={{
        referees: <RefereesPanel />,
        laws: <LawsAdminPanel />,
        referee: <VideoTestsAdminPanel />,
        library: <VideoLibraryContent canManageTaxonomy={false} />,
        stats: (
          <p className="text-sm text-text-secondary">
            Federation stats are coming soon. You&rsquo;ll see performance for your referees here.
          </p>
        ),
      }}
    />
  );
}
