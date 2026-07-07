"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  COUNTRY_FLAGS,
  REFEREE_LEVELS,
  STAT_CATEGORIES,
  STAT_REFEREES,
  getRefereeOverall,
} from "@/lib/stats-mock";
import { InfoTip } from "./InfoTip";
import { scoreTextColor } from "./score-utils";

type SortKey = "name" | "country" | "level" | "overall" | string; // category slug

export function MarksByReferee() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState<string>("all");
  const [level, setLevel] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("overall");
  const [sortDesc, setSortDesc] = useState(true);

  const countries = useMemo(
    () => [...new Set(STAT_REFEREES.map((r) => r.country))].sort(),
    []
  );

  const rows = useMemo(() => {
    let list = STAT_REFEREES.filter((r) => {
      if (search && !`${r.name} ${r.country}`.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (country !== "all" && r.country !== country) return false;
      if (level !== "all" && r.level !== level) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "country") cmp = a.country.localeCompare(b.country);
      else if (sortKey === "level") cmp = a.level.localeCompare(b.level);
      else if (sortKey === "overall") cmp = getRefereeOverall(a) - getRefereeOverall(b);
      else cmp = (a.scores[sortKey] ?? 0) - (b.scores[sortKey] ?? 0);
      return sortDesc ? -cmp : cmp;
    });
    return list;
  }, [search, country, level, sortKey, sortDesc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDesc((d) => !d);
    } else {
      setSortKey(key);
      setSortDesc(key !== "name" && key !== "country" && key !== "level");
    }
  };

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortDesc ? " ↓" : " ↑") : "";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-1.5 text-xl font-semibold text-text-primary">
            Marks by referee
            <InfoTip text="Average test mark per category, out of 10. Click any column header to sort." />
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Click a referee to open their record
          </p>
        </div>
      </div>

      {/* Search by… (deck: Referees → Category, Country, Name) */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name…"
          className="sm:max-w-xs"
        />
        <Select
          value={country}
          onChange={(v) => setCountry(String(v))}
          options={[
            { value: "all", label: "All countries" },
            ...countries.map((c) => ({ value: c, label: `${COUNTRY_FLAGS[c] ?? ""} ${c}` })),
          ]}
          className="sm:w-52"
        />
        <Select
          value={level}
          onChange={(v) => setLevel(String(v))}
          options={[
            { value: "all", label: "All categories" },
            ...REFEREE_LEVELS.map((l) => ({ value: l, label: l })),
          ]}
          className="sm:w-48"
        />
      </div>

      <Card padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-dark-600 bg-dark-700 text-left text-text-secondary">
              <tr>
                <th
                  className="sticky left-0 z-10 cursor-pointer select-none bg-dark-700 px-4 py-3 font-medium transition-colors hover:text-accent"
                  onClick={() => toggleSort("name")}
                >
                  Referee{sortIndicator("name")}
                </th>
                <th
                  className="cursor-pointer select-none px-3 py-3 font-medium transition-colors hover:text-accent"
                  onClick={() => toggleSort("country")}
                >
                  Country{sortIndicator("country")}
                </th>
                <th
                  className="cursor-pointer select-none px-3 py-3 font-medium transition-colors hover:text-accent"
                  onClick={() => toggleSort("level")}
                >
                  Category{sortIndicator("level")}
                </th>
                {STAT_CATEGORIES.map((c) => (
                  <th
                    key={c.slug}
                    className="cursor-pointer select-none whitespace-nowrap px-3 py-3 text-center font-medium transition-colors hover:text-accent"
                    onClick={() => toggleSort(c.slug)}
                    title={`${c.name} — click to sort`}
                  >
                    <span>{c.short}{sortIndicator(c.slug)}</span>
                    <Link
                      href={`/stats/category/${c.slug}`}
                      onClick={(e) => e.stopPropagation()}
                      className="ml-1 text-cyan-500/60 transition-colors hover:text-cyan-500"
                      title={`Open ${c.name} stats`}
                    >
                      ↗
                    </Link>
                  </th>
                ))}
                <th
                  className="cursor-pointer select-none whitespace-nowrap px-4 py-3 text-center font-medium transition-colors hover:text-accent"
                  onClick={() => toggleSort("overall")}
                >
                  Overall{sortIndicator("overall")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((referee) => {
                const overall = getRefereeOverall(referee);
                return (
                  <tr
                    key={referee.id}
                    onClick={() => router.push(`/stats/referee/${referee.id}`)}
                    className="group cursor-pointer border-t border-dark-600 transition-colors hover:bg-dark-700/60"
                  >
                    <td className="sticky left-0 z-10 bg-dark-800 px-4 py-3 transition-colors group-hover:bg-dark-700">
                      <span className="font-medium text-text-primary transition-colors group-hover:text-accent">
                        {referee.name}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-text-secondary">
                      <span className="mr-1.5">{COUNTRY_FLAGS[referee.country]}</span>
                      {referee.country}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <span className="inline-flex rounded-full bg-cyan-500/20 px-2 py-0.5 text-xs text-cyan-500">
                        {referee.level}
                      </span>
                    </td>
                    {STAT_CATEGORIES.map((c) => {
                      const score = referee.scores[c.slug] ?? 0;
                      return (
                        <td
                          key={c.slug}
                          className={`px-3 py-3 text-center font-semibold tabular-nums ${scoreTextColor(score)} ${
                            sortKey === c.slug ? "bg-dark-700/50" : ""
                          }`}
                        >
                          {score.toFixed(2)}
                        </td>
                      );
                    })}
                    <td
                      className={`px-4 py-3 text-center font-bold tabular-nums ${scoreTextColor(overall)} ${
                        sortKey === "overall" ? "bg-dark-700/50" : ""
                      }`}
                    >
                      {overall.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={STAT_CATEGORIES.length + 4}
                    className="px-4 py-10 text-center text-text-muted"
                  >
                    No referees match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-xs text-text-muted">
        CHA Challenges · OFF Offside · DOG DOGSO/SPA · SIM Simulation · TEA Teamwork · DIS Dissent ·
        HAN Handball · PAI PAI · LOTG Laws of the Game
      </p>
    </div>
  );
}
