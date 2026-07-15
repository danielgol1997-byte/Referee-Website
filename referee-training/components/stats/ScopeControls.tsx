"use client";

import { Select } from "@/components/ui/select";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { flagEmoji } from "@/lib/countries";
import type { AdminScope } from "@/lib/stats-mock";
import type { FilterableAssociation } from "./StatsFilterBar";

/**
 * Role-aware scope controls (association picker, federation/conference toggle,
 * rank picker) shared by the persistent filter bar and the export dialog so
 * both stay visually and behaviourally in sync.
 */
export function ScopeControls({
  isSuperAdmin,
  associations = [],
  hasDualScope = false,
  federationLabel,
  conferenceLabel,
  associationId,
  scope,
  rank,
  availableRanks,
  onAssociationChange,
  onScopeChange,
  onRankChange,
}: {
  isSuperAdmin: boolean;
  associations?: FilterableAssociation[];
  hasDualScope?: boolean;
  federationLabel?: string | null;
  conferenceLabel?: string | null;
  associationId: string | null;
  scope: AdminScope;
  rank: string | null;
  availableRanks: string[];
  onAssociationChange: (id: string | null) => void;
  onScopeChange: (scope: AdminScope) => void;
  onRankChange: (rank: string | null) => void;
}) {
  const associationOptions = [
    { value: "all", label: "All federations & confederations" },
    ...associations.map((a) => ({
      value: a.id,
      label: a.isInternational
        ? `🌍 ${a.name}`
        : `${flagEmoji(a.countryCode) || "🏳️"} ${a.name}`,
    })),
  ];

  return (
    <>
      {isSuperAdmin && (
        <Select
          value={associationId ?? "all"}
          onChange={(v) => onAssociationChange(v === "all" ? null : String(v))}
          options={associationOptions}
          className="w-52"
        />
      )}

      {hasDualScope && (
        <SegmentedControl
          value={scope}
          onChange={(v) => onScopeChange(v as AdminScope)}
          options={[
            { value: "federation", label: federationLabel ?? "Federation" },
            { value: "conference", label: conferenceLabel ?? "Conference" },
            { value: "both", label: "Both" },
          ]}
        />
      )}

      <Select
        value={rank ?? "all"}
        onChange={(v) => onRankChange(v === "all" ? null : String(v))}
        options={[
          { value: "all", label: "All ranks" },
          ...availableRanks.map((l) => ({ value: l, label: l })),
        ]}
        className="w-36"
      />
    </>
  );
}
