/**
 * Placeholder observer match reports for the Statistics mock-up.
 *
 * After every international match an observer files a report: a mark per
 * criteria plus written feedback. This module fabricates 5-6 deterministic
 * reports per referee per season and derives the "AI" analysis that combines
 * them and correlates match performance with platform test results.
 *
 * No real AI/API — every string here is generated locally from seeded data.
 */

import {
  getRefereeById,
  getSeasonTestScore,
  hashString,
  mulberry32,
  SEASONS,
  type Season,
} from "./stats-mock";

/** Criteria an observer grades (a subset of the platform categories). */
export const REPORT_CRITERIA: { slug: string; name: string }[] = [
  { slug: "challenges", name: "Challenges" },
  { slug: "handball", name: "Handball" },
  { slug: "dogso-spa", name: "DOGSO/SPA" },
  { slug: "teamwork", name: "Teamwork" },
  { slug: "dissent", name: "Dissent" },
  { slug: "offside", name: "Offside" },
  { slug: "laws-of-the-game", name: "Laws application" },
];

const OBSERVERS = [
  "Marco Rossi",
  "Per Larsson",
  "John O'Neill",
  "Hans Müller",
  "Filipe Costa",
  "Anatoli Petrov",
  "David Novak",
  "Rui Fernández",
];

const COMPETITIONS: { key: string; name: string; fixtures: string[] }[] = [
  {
    key: "UCL",
    name: "Champions League",
    fixtures: [
      "Real Madrid vs Man City",
      "Bayern München vs PSG",
      "Inter vs Arsenal",
      "Barcelona vs Liverpool",
      "Porto vs Dortmund",
    ],
  },
  {
    key: "UEL",
    name: "Europa League",
    fixtures: [
      "Ajax vs Roma",
      "Sevilla vs Leverkusen",
      "Feyenoord vs Villarreal",
      "Lyon vs Rangers",
    ],
  },
  {
    key: "UECL",
    name: "Conference League",
    fixtures: [
      "Fiorentina vs Gent",
      "Aston Villa vs Lille",
      "Slavia Prague vs Fenerbahçe",
    ],
  },
  {
    key: "EURO",
    name: "European Championship",
    fixtures: ["Portugal vs France", "Italy vs Spain", "Germany vs Netherlands"],
  },
  {
    key: "WC",
    name: "World Cup",
    fixtures: ["Argentina vs Brazil", "England vs Croatia", "Spain vs Uruguay"],
  },
];

const STRENGTH_PHRASES: Record<string, string> = {
  challenges: "read the intensity of challenges superbly, keeping a firm and consistent threshold",
  handball: "judged handball situations accurately and communicated them clearly to players",
  "dogso-spa": "showed excellent judgement on DOGSO/SPA, correctly weighing distance and control",
  teamwork: "was outstanding in teamwork, staying proactive with the ARs and VAR throughout",
  dissent: "managed dissent calmly, using presence and dialogue to keep firm control",
  offside: "positioned excellently for offside phases, consistently level with play",
  "laws-of-the-game": "applied the Laws precisely and with real confidence",
};

const IMPROVEMENT_PHRASES: Record<string, string> = {
  challenges: "some midfield challenges were judged a touch leniently; a firmer early tone would help",
  handball: "a couple of handball calls needed clearer justification — revisit the arm-position criteria",
  "dogso-spa": "one DOGSO/SPA decision was delayed; quicker recognition of the attacking opportunity is needed",
  teamwork: "communication with the AR dropped late on — keep that channel active in the closing stages",
  dissent: "reacted a little late to a cluster of dissent; earlier intervention would prevent escalation",
  offside: "lost the offside line once in a quick transition — anticipate the second-phase runs",
  "laws-of-the-game": "a restart procedure was misapplied; a quick Law review would sharpen accuracy",
};

const REPORTS_MONTHS = [8, 9, 11, 1, 3, 4]; // Aug, Sep, Nov, Jan, Mar, Apr

export type ObserverReport = {
  id: string;
  refereeId: string;
  season: Season;
  date: Date;
  competition: string;
  fixture: string;
  observer: string;
  /** Mark per criteria slug (0-10) */
  marks: Record<string, number>;
  overall: number;
  text: string;
};

function seasonStartYear(season: Season): number {
  return parseInt(season.slice(0, 4), 10);
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

/** Deterministic set of reports for one referee in one season. */
export function getObserverReports(refereeId: string, season: Season): ObserverReport[] {
  const referee = getRefereeById(refereeId);
  if (!referee) return [];

  const rand = mulberry32(hashString(`reports:${refereeId}:${season}`));
  const count = 5 + Math.floor(rand() * 2); // 5 or 6
  const startYear = seasonStartYear(season);
  const isElite = referee.level === "Elite";

  // Elite referees skew to bigger competitions.
  const compPool = isElite
    ? ["UCL", "UCL", "UEL", "EURO", "WC", "UECL"]
    : ["UECL", "UEL", "UEL", "UCL", "UECL", "EURO"];

  const reports: ObserverReport[] = [];
  for (let i = 0; i < count; i++) {
    const compKey = compPool[i % compPool.length];
    const competition = COMPETITIONS.find((c) => c.key === compKey) ?? COMPETITIONS[1];
    const fixture = pick(competition.fixtures, rand);
    const observer = pick(OBSERVERS, rand);

    const month = REPORTS_MONTHS[i % REPORTS_MONTHS.length];
    const year = month >= 7 ? startYear : startYear + 1;
    const day = 6 + Math.floor(rand() * 20);
    // UTC so server and client format the same day (avoids hydration mismatch).
    const date = new Date(Date.UTC(year, month - 1, day));

    const marks: Record<string, number> = {};
    for (const crit of REPORT_CRITERIA) {
      const base = getSeasonTestScore(refereeId, crit.slug, season);
      // Match performance varies more than test scores.
      const noise = (rand() - 0.5) * 1.6;
      marks[crit.slug] = Math.max(5, Math.min(10, Math.round((base + noise) * 2) / 2));
    }
    const overall =
      Math.round(
        (Object.values(marks).reduce((s, v) => s + v, 0) / REPORT_CRITERIA.length) * 2
      ) / 2;

    // Text references this referee's best & weakest criteria in this report.
    const sorted = [...REPORT_CRITERIA].sort((a, b) => marks[b.slug] - marks[a.slug]);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    const openers = [
      "A composed and authoritative performance.",
      "A solid display with clear match control.",
      "A confident showing in a demanding fixture.",
      "An assured performance under pressure.",
    ];
    const text = `${pick(openers, rand)} ${referee.name.split(" ")[0]} ${STRENGTH_PHRASES[best.slug]}. However, ${IMPROVEMENT_PHRASES[worst.slug]}.`;

    reports.push({
      id: `${refereeId}-${season.replace("/", "")}-${i}`,
      refereeId,
      season,
      date,
      competition: competition.name,
      fixture,
      observer,
      marks,
      overall,
      text,
    });
  }

  return reports.sort((a, b) => b.date.getTime() - a.date.getTime());
}

/** Average observer mark per criteria across a season's reports. */
export function getReportCriteriaAverages(
  refereeId: string,
  season: Season
): Record<string, number> {
  const reports = getObserverReports(refereeId, season);
  const averages: Record<string, number> = {};
  for (const crit of REPORT_CRITERIA) {
    if (reports.length === 0) {
      averages[crit.slug] = 0;
      continue;
    }
    const sum = reports.reduce((s, r) => s + r.marks[crit.slug], 0);
    averages[crit.slug] = sum / reports.length;
  }
  return averages;
}

export function getReportOverallAverage(refereeId: string, season: Season): number {
  const reports = getObserverReports(refereeId, season);
  if (reports.length === 0) return 0;
  return reports.reduce((s, r) => s + r.overall, 0) / reports.length;
}

export type Alignment = "aligned" | "tests-ahead" | "matches-ahead";

export type CorrelationPoint = {
  slug: string;
  name: string;
  reportMark: number;
  testMark: number;
  diff: number; // testMark - reportMark
  alignment: Alignment;
};

/** Per-criteria comparison of observer match marks vs platform test marks. */
export function getCorrelation(refereeId: string, season: Season): CorrelationPoint[] {
  const reportAverages = getReportCriteriaAverages(refereeId, season);
  return REPORT_CRITERIA.map((crit) => {
    const reportMark = reportAverages[crit.slug];
    const testMark = getSeasonTestScore(refereeId, crit.slug, season);
    const diff = testMark - reportMark;
    let alignment: Alignment = "aligned";
    if (diff > 0.4) alignment = "tests-ahead";
    else if (diff < -0.4) alignment = "matches-ahead";
    return { slug: crit.slug, name: crit.name, reportMark, testMark, diff, alignment };
  });
}

export const ALIGNMENT_META: Record<Alignment, { label: string; text: string; badge: string }> = {
  aligned: {
    label: "Aligned",
    text: "text-[#4ade80]",
    badge: "bg-[#22c55e]/15 text-[#4ade80] border-[#22c55e]/30",
  },
  "tests-ahead": {
    label: "Tests ahead of matches",
    text: "text-cyan-500",
    badge: "bg-cyan-500/15 text-cyan-500 border-cyan-500/30",
  },
  "matches-ahead": {
    label: "Matches ahead of tests",
    text: "text-[#fbbf24]",
    badge: "bg-[#f59e0b]/15 text-[#fbbf24] border-[#f59e0b]/30",
  },
};

export type AiAnalysis = {
  summary: string;
  strengths: { slug: string; name: string; mark: number }[];
  focus: { slug: string; name: string; mark: number }[];
  reportCount: number;
  overallMatch: number;
  overallTest: number;
  alignmentHeadline: string;
};

/** The combined, "AI-generated" analysis for a referee in a season. */
export function getAiAnalysis(refereeId: string, season: Season): AiAnalysis {
  const referee = getRefereeById(refereeId);
  const reports = getObserverReports(refereeId, season);
  const averages = getReportCriteriaAverages(refereeId, season);
  const correlation = getCorrelation(refereeId, season);

  const ranked = [...REPORT_CRITERIA].sort((a, b) => averages[b.slug] - averages[a.slug]);
  const strengths = ranked.slice(0, 2).map((c) => ({ slug: c.slug, name: c.name, mark: averages[c.slug] }));
  const focus = ranked
    .slice(-2)
    .reverse()
    .map((c) => ({ slug: c.slug, name: c.name, mark: averages[c.slug] }));

  const overallMatch = getReportOverallAverage(refereeId, season);
  const overallTest =
    correlation.reduce((s, c) => s + c.testMark, 0) / (correlation.length || 1);

  const aligned = correlation.filter((c) => c.alignment === "aligned").length;
  const testsAhead = correlation.filter((c) => c.alignment === "tests-ahead").length;
  const matchesAhead = correlation.filter((c) => c.alignment === "matches-ahead").length;

  let alignmentHeadline: string;
  if (aligned >= correlation.length - 1) {
    alignmentHeadline = "Match performance and test results are strongly aligned.";
  } else if (testsAhead > matchesAhead) {
    alignmentHeadline =
      "Test scores run ahead of match marks — strong theory that isn't fully translating to the pitch yet.";
  } else if (matchesAhead > testsAhead) {
    alignmentHeadline =
      "Match marks run ahead of tests — excellent on the pitch; the platform tests can catch up.";
  } else {
    alignmentHeadline = "A mixed picture between match performance and test results.";
  }

  const name = referee?.name.split(" ")[0] ?? "This referee";
  const summary =
    `Across ${reports.length} observer reports in ${season}, ${name} averaged ` +
    `${overallMatch.toFixed(1)} on match day. The reports most consistently praise ` +
    `${strengths[0].name.toLowerCase()} and ${strengths[1].name.toLowerCase()}, while ` +
    `${focus[0].name.toLowerCase()} is the recurring development theme. ${alignmentHeadline}`;

  return {
    summary,
    strengths,
    focus,
    reportCount: reports.length,
    overallMatch,
    overallTest,
    alignmentHeadline,
  };
}

export function formatReportDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export const OBSERVER_SEASONS = SEASONS;
