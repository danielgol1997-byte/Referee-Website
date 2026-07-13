"use client";

import { Card } from "@/components/ui/card";
import {
  COUNTRY_FLAGS,
  MOCK_CURRENT_YEAR,
  STAT_REFEREES,
  TOURNAMENTS,
  fitnessLevelMeta,
  getRefereeOverall,
  getTotalTournamentGames,
  type StatReferee,
} from "@/lib/stats-mock";
import { AnimatedNumber } from "./AnimatedNumber";
import { InfoTip } from "./InfoTip";
import { scoreTextColor } from "./score-utils";

function Metric({
  label,
  value,
  unit,
  info,
}: {
  label: string;
  value: string;
  unit?: string;
  info?: string;
}) {
  return (
    <div className="flex h-[74px] flex-col items-center justify-center gap-0.5 rounded-lg border border-dark-600 bg-dark-900/40 px-3 py-2.5 text-center">
      <p className="flex items-center justify-center gap-1 text-[11px] uppercase tracking-wide text-text-muted">
        {label}
        {info && <InfoTip text={info} />}
      </p>
      <p className="text-lg font-bold text-text-primary tabular-nums">
        {value}
        {unit && <span className="ml-0.5 text-xs font-medium text-text-muted">{unit}</span>}
      </p>
    </div>
  );
}

export function ProfileCard({
  referee,
  isOwnView = false,
}: {
  referee: StatReferee;
  isOwnView?: boolean;
}) {
  const { profile } = referee;
  const overall = getRefereeOverall(referee);
  // Rank only against referees in the same level (Elite, Category 1, ...).
  const levelPeers = STAT_REFEREES.filter((r) => r.level === referee.level);
  const rank =
    [...levelPeers]
      .sort((a, b) => getRefereeOverall(b) - getRefereeOverall(a))
      .findIndex((r) => r.id === referee.id) + 1;
  const yearsInternational = MOCK_CURRENT_YEAR - profile.internationalSince;
  const fitness = fitnessLevelMeta(profile.fitnessLevel);
  const totalGames = getTotalTournamentGames(referee);

  return (
    <Card className="space-y-6">
      {/* Identity */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-5">

          {/* Portrait: video > hologram image > photo > flag fallback */}
          <div className="flex-shrink-0">
            {referee.videoUrl ? (
              <video
                src={referee.videoUrl}
                autoPlay
                loop
                muted
                playsInline
                className="h-40 w-32 rounded-2xl object-cover object-top"
              />
            ) : referee.hologramUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={referee.hologramUrl}
                alt={referee.name}
                className="h-40 w-32 rounded-2xl object-cover object-top"
              />
            ) : referee.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={referee.photoUrl}
                alt={referee.name}
                className="h-40 w-32 rounded-2xl object-cover object-top"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-dark-600 to-dark-700 text-2xl">
                {COUNTRY_FLAGS[referee.country]}
              </div>
            )}
          </div>

          <div className="pt-1">
            <div className="w-10 h-1 bg-gradient-to-r from-warm to-cyan-500 rounded-full mb-2" />
            <h1 className="text-2xl font-bold text-premium sm:text-3xl">
              {isOwnView ? "My Stats" : referee.name}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
              {isOwnView && (
                <span className="font-medium text-text-primary">{referee.name}</span>
              )}
              <span>{COUNTRY_FLAGS[referee.country]} {referee.country}</span>
              <span className="inline-flex rounded-full bg-cyan-500/20 px-2 py-0.5 text-xs text-cyan-500">
                {referee.level}
              </span>
              <span className="text-text-muted">·</span>
              <span>
                Rank <span className="font-bold text-accent">#{rank}</span> of {levelPeers.length} in {referee.level}
              </span>
            </p>
          </div>
        </div>

        <div className="text-left sm:text-right">
          <p className="flex items-center gap-1 text-sm text-text-secondary sm:justify-end">
            Overall ave. mark
            <InfoTip text="Average of this referee's test marks across all categories, out of 10." />
          </p>
          <p className={`text-4xl font-bold tabular-nums ${scoreTextColor(overall)}`}>
            <AnimatedNumber value={overall} decimals={2} />
          </p>
        </div>
      </div>

      {/* Physical */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
          Physical
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <Metric label="Age" value={String(profile.age)} />
          <Metric label="Height" value={String(profile.heightCm)} unit="cm" />
          <Metric label="Weight" value={String(profile.weightKg)} unit="kg" />
          <Metric
            label="Body fat"
            value={profile.bodyFatPct.toFixed(1)}
            unit="%"
            info="Estimated body-fat percentage from the latest fitness assessment."
          />
          <div className="flex h-[74px] flex-col items-center justify-center gap-1 rounded-lg border border-dark-600 bg-dark-900/40 px-3 py-2.5 text-center">
            <p className="flex items-center justify-center gap-1 text-[11px] uppercase tracking-wide text-text-muted">
              Fitness
              <InfoTip text="Overall fitness band from the latest assessment: Excellent down to Poor." />
            </p>
            <p className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-bold ${fitness.badge}`}>
              {profile.fitnessLevel}
            </p>
          </div>
        </div>
      </div>

      {/* Career */}
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted">
          International career
          <InfoTip text="Matches officiated in each UEFA/FIFA competition since going international." />
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent">
            International since {profile.internationalSince}
            <span className="ml-1 text-text-muted">({yearsInternational} yrs)</span>
          </span>
          {TOURNAMENTS.map((t) => (
            <span
              key={t.key}
              title={t.name}
              className="rounded-lg border border-dark-600 bg-dark-900/50 px-3 py-1.5 text-xs font-medium text-text-secondary"
            >
              {t.key}
              <span className="ml-1.5 font-bold text-text-primary tabular-nums">
                {profile.tournaments[t.key]}
              </span>
            </span>
          ))}
          <span className="rounded-lg px-2 py-1.5 text-xs text-text-muted">
            {totalGames} games total
          </span>
        </div>
      </div>
    </Card>
  );
}
