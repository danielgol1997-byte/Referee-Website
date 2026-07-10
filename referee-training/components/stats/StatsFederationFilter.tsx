"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Select } from "@/components/ui/select";
import { flagEmoji } from "@/lib/countries";

type Association = { id: string; name: string; countryCode: string | null };

/**
 * Super-admin-only federation filter for the stats pages. Navigates with a
 * `fa` query param; FA admins never see this (they are locked to their FA).
 */
export function StatsFederationFilter({
  associations,
  value,
  activeTab,
}: {
  associations: Association[];
  value: string;
  activeTab: string;
}) {
  const router = useRouter();

  const options = useMemo(
    () => [
      { value: "all", label: "All federations" },
      ...associations.map((a) => ({
        value: a.id,
        label: `${flagEmoji(a.countryCode) || "🏳️"} ${a.name}`,
      })),
    ],
    [associations]
  );

  return (
    <div className="w-56">
      <Select
        value={value}
        options={options}
        onChange={(v) => {
          const fa = String(v);
          const tabQuery = activeTab === "overview" ? "" : `tab=${activeTab}`;
          const faQuery = fa === "all" ? "" : `fa=${fa}`;
          const query = [tabQuery, faQuery].filter(Boolean).join("&");
          router.push(query ? `/stats?${query}` : "/stats", { scroll: false });
        }}
      />
    </div>
  );
}
