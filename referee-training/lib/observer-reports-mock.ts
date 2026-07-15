/**
 * Placeholder observer match reports for the Statistics mock-up.
 *
 * Modelled field-for-field on the real UEFA post-match observer report for
 * main referees: match header, level of difficulty, the six assessment
 * sections (each graded + / Expected / −), disciplinary & penalty statistics,
 * main incidents, and the written general comments. Marks sit on the official
 * UEFA scale (≈6.0–10, 8.4 = expected benchmark), never 0–100.
 *
 * Everything is generated locally from seeded data — no real AI/API. The
 * "analysis" combines a season's reports and correlates match performance with
 * platform test results via the shared Performance Index.
 */

import {
  getRefereeById,
  getSeasonTestScore,
  hashString,
  mulberry32,
  SEASONS,
  type Season,
} from "./stats-mock";
import {
  alignmentFor,
  CRITERION_SECTION,
  matchMarkToIndex,
  testMarkToIndex,
  type Alignment,
} from "./performance-index";

/* ---------- Template structure (mirrors the UEFA report) ---------- */

export type Rating = "plus" | "expected" | "minus";

/** Each assessment section and its sub-criteria, keyed to a driving category. */
type SectionTemplate = {
  id: string;
  title: string;
  /** [display label, platform category slug that drives the rating] */
  items: [string, string][];
};

const SECTION_TEMPLATE: SectionTemplate[] = [
  {
    id: "control",
    title: "Match Control & Management",
    items: [
      ["General control of the match", "overall"],
      ["Proactive & preventive approach", "overall"],
      ["Reading the game / temperature", "overall"],
      ["Management of the players", "dissent"],
      ["Management of coaches / technical areas", "dissent"],
      ["Confrontation / dissent management", "dissent"],
      ["Referee / captain cooperation", "teamwork"],
    ],
  },
  {
    id: "technical",
    title: "Technical Analysis",
    items: [
      ["Foul detection / accuracy", "challenges"],
      ["Handball evaluation", "handball"],
      ["Use of advantage", "challenges"],
      ["Free kick / penalty kick management", "pai"],
      ["Treatment of injured players", "laws-of-the-game"],
      ["Time management", "laws-of-the-game"],
      ["VAR interventions management (OFR)", "offside"],
    ],
  },
  {
    id: "disciplinary",
    title: "Disciplinary Analysis",
    items: [
      ["Consistency in disciplinary decisions", "overall"],
      ["Challenges", "challenges"],
      ["Handball", "handball"],
      ["Holding / pulling", "challenges"],
      ["Stopping promising attacks", "dogso-spa"],
      ["Dissent / protest", "dissent"],
      ["Persistent offences", "challenges"],
      ["Simulation", "simulation"],
      ["Serious foul play", "challenges"],
      ["DOGSO situations", "dogso-spa"],
    ],
  },
  {
    id: "physical",
    title: "Physical Condition & Positioning",
    items: [
      ["General physical condition", "overall"],
      ["Anticipation / reading next phase", "offside"],
      ["Ball-in-play positioning", "offside"],
      ["Positioning at set pieces / dead ball", "pai"],
    ],
  },
  {
    id: "teamwork",
    title: "Team Work",
    items: [
      ["Co-operation with assistant referees", "teamwork"],
      ["Co-operation with 4th official", "teamwork"],
      ["Co-operation with VAR", "teamwork"],
    ],
  },
  {
    id: "personality",
    title: "Personality",
    items: [
      ["Authority / leadership", "overall"],
      ["Respect / credibility", "overall"],
      ["Body language", "dissent"],
      ["Communication", "teamwork"],
      ["General behaviour (pre & post-match)", "overall"],
    ],
  },
];

/** Categories that have both a platform test score and an observer read. */
export const COMPARE_CRITERIA: { slug: string; name: string }[] = [
  { slug: "challenges", name: "Challenges" },
  { slug: "handball", name: "Handball" },
  { slug: "dogso-spa", name: "DOGSO/SPA" },
  { slug: "simulation", name: "Simulation" },
  { slug: "dissent", name: "Dissent" },
  { slug: "teamwork", name: "Teamwork" },
  { slug: "pai", name: "PAI" },
  { slug: "laws-of-the-game", name: "Laws application" },
];

export const DIFFICULTIES = ["Normal", "Quite challenging", "Very challenging"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

const OBSERVERS = [
  "PANIASHVILI Levan",
  "ROSSI Marco",
  "LARSSON Per",
  "O'NEILL John",
  "MÜLLER Hans",
  "COSTA Filipe",
  "PETROV Anatoli",
  "NOVAK David",
];

const COMPETITIONS: { key: string; name: string; rounds: string[]; fixtures: [string, string][] }[] = [
  {
    key: "UCL",
    name: "Champions League",
    rounds: ["League phase", "Round of 16", "Quarter-final", "Semi-final"],
    fixtures: [
      ["Real Madrid", "Man City"],
      ["Bayern München", "PSG"],
      ["Inter", "Arsenal"],
      ["Barcelona", "Liverpool"],
      ["Porto", "Dortmund"],
    ],
  },
  {
    key: "UEL",
    name: "Europa League",
    rounds: ["League phase", "Knock-out play-off", "Round of 16", "Quarter-final"],
    fixtures: [
      ["Ajax", "Roma"],
      ["Sevilla", "Leverkusen"],
      ["Feyenoord", "Villarreal"],
      ["Lyon", "Rangers"],
    ],
  },
  {
    key: "UECL",
    name: "Conference League",
    rounds: ["League phase", "Knock-out play-off", "Round of 16"],
    fixtures: [
      ["FC Noah", "AZ Alkmaar"],
      ["Fiorentina", "Gent"],
      ["Aston Villa", "Lille"],
      ["Slavia Prague", "Fenerbahçe"],
    ],
  },
  {
    key: "EURO",
    name: "European Championship",
    rounds: ["Group stage", "Round of 16", "Quarter-final"],
    fixtures: [
      ["Portugal", "France"],
      ["Italy", "Spain"],
      ["Germany", "Netherlands"],
    ],
  },
  {
    key: "WC",
    name: "World Cup",
    rounds: ["Group stage", "Round of 16", "Quarter-final"],
    fixtures: [
      ["Argentina", "Brazil"],
      ["England", "Croatia"],
      ["Spain", "Uruguay"],
    ],
  },
];

const VENUES: Record<string, [stadium: string, city: string, country: string]> = {
  "Real Madrid": ["Santiago Bernabéu", "Madrid", "Spain"],
  "Bayern München": ["Allianz Arena", "Munich", "Germany"],
  Inter: ["San Siro", "Milan", "Italy"],
  Barcelona: ["Estadi Olímpic", "Barcelona", "Spain"],
  Porto: ["Estádio do Dragão", "Porto", "Portugal"],
  Ajax: ["Johan Cruijff ArenA", "Amsterdam", "Netherlands"],
  Sevilla: ["Ramón Sánchez-Pizjuán", "Seville", "Spain"],
  Feyenoord: ["De Kuip", "Rotterdam", "Netherlands"],
  Lyon: ["Groupama Stadium", "Lyon", "France"],
  "FC Noah": ["Republican Stadium", "Yerevan", "Armenia"],
  Fiorentina: ["Artemio Franchi", "Florence", "Italy"],
  "Aston Villa": ["Villa Park", "Birmingham", "England"],
  "Slavia Prague": ["Fortuna Arena", "Prague", "Czech Republic"],
  Portugal: ["Estádio da Luz", "Lisbon", "Portugal"],
  Italy: ["Stadio Olimpico", "Rome", "Italy"],
  Germany: ["Olympiastadion", "Berlin", "Germany"],
  Argentina: ["Estadio Monumental", "Buenos Aires", "Argentina"],
  England: ["Wembley Stadium", "London", "England"],
  Spain: ["Metropolitano", "Madrid", "Spain"],
};

const STRENGTH_PHRASES: Record<string, string> = {
  challenges: "reading the intensity of challenges with a firm, consistent threshold",
  handball: "clear, well-communicated handball judgements",
  "dogso-spa": "excellent judgement on DOGSO/SPA, weighing distance and control correctly",
  simulation: "spotting simulation early and dealing with it decisively",
  dissent: "calm, authoritative dissent management",
  teamwork: "proactive teamwork with the ARs and VAR throughout",
  pai: "composed, accurate handling of penalty-area incidents",
  "laws-of-the-game": "precise, confident application of the Laws",
  overall: "full control and a mature reading of the game",
};

const IMPROVEMENT_PHRASES: Record<string, string> = {
  challenges: "a firmer early tone on midfield challenges",
  handball: "clearer justification of borderline handball calls",
  "dogso-spa": "quicker recognition of the attacking opportunity on SPA/DOGSO",
  simulation: "earlier, more decisive action on simulation",
  dissent: "intervening sooner on clusters of dissent to prevent escalation",
  teamwork: "keeping the AR communication channel active into the closing stages",
  pai: "sharper positioning for penalty-area incidents",
  "laws-of-the-game": "tightening a restart procedure to match the Laws exactly",
  overall: "sustaining concentration through the final phase",
};

const REPORTS_MONTHS = [8, 9, 11, 1, 3, 4]; // Aug, Sep, Nov, Jan, Mar, Apr

export type ReportSection = {
  id: string;
  title: string;
  items: { label: string; rating: Rating }[];
  /** Section-level roll-up: net of + and − ratings. */
  net: number;
};

export type ObserverReport = {
  id: string;
  refereeId: string;
  season: Season;
  date: Date;
  competition: string;
  round: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  stadium: string;
  city: string;
  country: string;
  observer: string;
  difficulty: Difficulty;
  /** Overall UEFA mark for the referee (≈6.5–9.4). */
  mark: number;
  sections: ReportSection[];
  cards: { yellow: number; red: number; secondYellow: number; missed: number };
  penalties: { awarded: number; notAwarded: number; correct: number; incorrect: number };
  mainIncidents: { minute: number; type: string; description: string }[];
  comments: string;
  positives: string[];
  improvements: string[];
  /** Per-category latent match value on the UEFA scale (drives ratings + correlation). */
  criterionMatch: Record<string, number>;
};

function seasonStartYear(season: Season): number {
  return parseInt(season.slice(0, 4), 10);
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

/** Compress a 0–10 platform test score onto the realistic UEFA match scale. */
function compressToMatch(testScore: number): number {
  return testScore * 0.55 + 3.7; // 6.8 → ~7.4, 8.4 → ~8.3, 9.8 → ~9.1
}

function ratingFromLatent(latent: number, jitter: number): Rating {
  const v = latent + jitter;
  if (v >= 8.75) return "plus";
  if (v <= 8.0) return "minus";
  return "expected";
}

/** Deterministic set of reports for one referee in one season. */
export function getObserverReports(refereeId: string, season: Season): ObserverReport[] {
  const referee = getRefereeById(refereeId);
  if (!referee) return [];

  const rand = mulberry32(hashString(`reports2:${refereeId}:${season}`));
  const count = 5 + Math.floor(rand() * 2); // 5 or 6
  const startYear = seasonStartYear(season);
  const isElite = referee.level === "Elite";

  const compPool = isElite
    ? ["UCL", "UCL", "UEL", "EURO", "WC", "UECL"]
    : ["UECL", "UEL", "UEL", "UCL", "UECL", "EURO"];

  const overallTest =
    COMPARE_CRITERIA.reduce((s, c) => s + getSeasonTestScore(refereeId, c.slug, season), 0) /
    COMPARE_CRITERIA.length;

  const reports: ObserverReport[] = [];
  for (let i = 0; i < count; i++) {
    const compKey = compPool[i % compPool.length];
    const competition = COMPETITIONS.find((c) => c.key === compKey) ?? COMPETITIONS[1];
    const [homeTeam, awayTeam] = pick(competition.fixtures, rand);
    const round = pick(competition.rounds, rand);
    const observer = pick(OBSERVERS, rand);
    const [stadium, city, country] = VENUES[homeTeam] ?? ["National Stadium", "—", "—"];

    const homeScore = Math.floor(rand() * 4);
    const awayScore = Math.floor(rand() * 3);

    const month = REPORTS_MONTHS[i % REPORTS_MONTHS.length];
    const year = month >= 7 ? startYear : startYear + 1;
    const day = 6 + Math.floor(rand() * 20);
    const date = new Date(Date.UTC(year, month - 1, day));

    const diffRoll = rand();
    const difficulty: Difficulty =
      diffRoll > 0.82 ? "Very challenging" : diffRoll > 0.5 ? "Quite challenging" : "Normal";

    // Per-category latent match value (UEFA scale), correlated to test ability
    // but with genuine match-day variance.
    const criterionMatch: Record<string, number> = {};
    for (const crit of COMPARE_CRITERIA) {
      const testScore = getSeasonTestScore(refereeId, crit.slug, season);
      const noise = (rand() - 0.5) * 0.9;
      criterionMatch[crit.slug] = Math.max(
        6.6,
        Math.min(9.5, compressToMatch(testScore) + noise)
      );
    }
    criterionMatch.overall = Math.max(
      6.6,
      Math.min(9.5, compressToMatch(overallTest) + (rand() - 0.5) * 0.6)
    );

    // Build the six sections, deriving +/Expected/− per sub-criterion.
    const sections: ReportSection[] = SECTION_TEMPLATE.map((section) => {
      const items = section.items.map(([label, slug], k) => {
        const latent = criterionMatch[slug] ?? criterionMatch.overall;
        const jitter = (mulberry32(hashString(`${refereeId}:${season}:${i}:${section.id}:${k}`))() - 0.5) * 0.7;
        return { label, rating: ratingFromLatent(latent, jitter) };
      });
      const net = items.reduce((s, it) => s + (it.rating === "plus" ? 1 : it.rating === "minus" ? -1 : 0), 0);
      return { id: section.id, title: section.title, items, net };
    });

    // Overall mark: mean latent, nudged by difficulty, clamped and rounded to .1.
    const meanLatent =
      Object.values(criterionMatch).reduce((s, v) => s + v, 0) /
      Object.values(criterionMatch).length;
    const diffBonus = difficulty === "Very challenging" ? 0.12 : difficulty === "Quite challenging" ? 0.06 : 0;
    const mark = Math.max(
      6.8,
      Math.min(9.3, Math.round((meanLatent + diffBonus + (rand() - 0.5) * 0.15) * 10) / 10)
    );

    // Disciplinary + penalty statistics.
    const yellow = 1 + Math.floor(rand() * 5);
    const red = rand() > 0.85 ? 1 : 0;
    const secondYellow = rand() > 0.9 ? 1 : 0;
    const missed = mark < 8.0 && rand() > 0.5 ? 1 : 0;
    const awarded = rand() > 0.65 ? 1 : 0;
    const notAwarded = rand() > 0.7 ? 1 : 0;
    const incorrect = mark < 7.9 && rand() > 0.6 ? 1 : 0;
    const correct = awarded + notAwarded + (rand() > 0.4 ? 1 : 0);

    // Ranked strengths / weaknesses for the written comments.
    const ranked = [...COMPARE_CRITERIA].sort(
      (a, b) => criterionMatch[b.slug] - criterionMatch[a.slug]
    );
    const best = ranked[0];
    const worst = ranked[ranked.length - 1];

    const mainIncidents: { minute: number; type: string; description: string }[] = [];
    if (awarded || notAwarded || incorrect) {
      const minute = 10 + Math.floor(rand() * 80);
      const type = incorrect ? "Penalty (reviewed)" : awarded ? "Penalty" : "Penalty (not given)";
      const desc = incorrect
        ? "Contact in the penalty area; on-field decision corrected after VAR review."
        : awarded
          ? "Clear tripping offence in the area — correctly penalised."
          : "Play-on after a challenge in the area; supported as a correct decision.";
      mainIncidents.push({ minute, type, description: desc });
    }
    if (red || secondYellow) {
      mainIncidents.push({
        minute: 55 + Math.floor(rand() * 35),
        type: secondYellow ? "Second yellow card" : "Direct red card",
        description: secondYellow
          ? "Reckless second caution correctly issued after a tactical foul."
          : "Serious foul play correctly sanctioned with a direct dismissal.",
      });
    }

    const openers = [
      "A composed and authoritative performance.",
      "A solid display with clear match control.",
      "A confident showing in a demanding fixture.",
      "An assured performance under pressure.",
    ];
    const comments =
      `${pick(openers, rand)} ${referee.name.split(" ")[0]} showed ${STRENGTH_PHRASES[best.slug]}. ` +
      `${difficulty === "Normal" ? "A largely controlled match" : "A genuinely testing fixture"} handled at the expected level. ` +
      `The main area to develop remains ${IMPROVEMENT_PHRASES[worst.slug]}. Final mark ${mark.toFixed(1)}.`;

    const positives = [best.name, ranked[1].name, "Match control"].slice(0, 3);
    const improvements = [worst.name, ranked[ranked.length - 2].name].slice(0, 2);

    reports.push({
      id: `${refereeId}-${season.replace("/", "")}-${i}`,
      refereeId,
      season,
      date,
      competition: competition.name,
      round,
      homeTeam,
      awayTeam,
      homeScore,
      awayScore,
      stadium,
      city,
      country,
      observer,
      difficulty,
      mark,
      sections,
      cards: { yellow, red, secondYellow, missed },
      penalties: { awarded, notAwarded, correct, incorrect },
      mainIncidents,
      comments,
      positives,
      improvements,
      criterionMatch,
    });
  }

  return reports.sort((a, b) => b.date.getTime() - a.date.getTime());
}

/* ---------- Season roll-ups ---------- */

export function getSeasonMatchAverage(refereeId: string, season: Season): number {
  const reports = getObserverReports(refereeId, season);
  if (reports.length === 0) return 0;
  return reports.reduce((s, r) => s + r.mark, 0) / reports.length;
}

/** Average latent match value per category across a season's reports. */
export function getSeasonCriterionMatch(refereeId: string, season: Season): Record<string, number> {
  const reports = getObserverReports(refereeId, season);
  const out: Record<string, number> = {};
  for (const crit of COMPARE_CRITERIA) {
    if (reports.length === 0) {
      out[crit.slug] = 0;
      continue;
    }
    out[crit.slug] =
      reports.reduce((s, r) => s + (r.criterionMatch[crit.slug] ?? 0), 0) / reports.length;
  }
  return out;
}

/* ---------- Tests vs match comparison (on the Performance Index) ---------- */

export type ComparisonPoint = {
  slug: string;
  name: string;
  section: string;
  testMark: number; // raw 0–10 platform mark
  matchMark: number; // raw UEFA-scale match value
  testIndex: number; // 0–100
  matchIndex: number; // 0–100
  gap: number; // testIndex − matchIndex
  alignment: Alignment;
};

/** Per-criterion comparison of platform tests vs observer match reads. */
export function getComparison(refereeId: string, season: Season): ComparisonPoint[] {
  const seasonMatch = getSeasonCriterionMatch(refereeId, season);
  return COMPARE_CRITERIA.map((crit) => {
    const testMark = getSeasonTestScore(refereeId, crit.slug, season);
    const matchMark = seasonMatch[crit.slug];
    const testIndex = testMarkToIndex(testMark);
    const matchIndex = matchMarkToIndex(matchMark);
    const gap = testIndex - matchIndex;
    return {
      slug: crit.slug,
      name: crit.name,
      section: CRITERION_SECTION[crit.slug] ?? "",
      testMark,
      matchMark,
      testIndex,
      matchIndex,
      gap,
      alignment: alignmentFor(gap),
    };
  });
}

/** 0–100 consistency: how closely tests and matches track each other overall. */
export function getConsistencyScore(refereeId: string, season: Season): number {
  const comparison = getComparison(refereeId, season);
  if (comparison.length === 0) return 0;
  const meanAbsGap =
    comparison.reduce((s, c) => s + Math.abs(c.gap), 0) / comparison.length;
  return Math.max(0, Math.round(100 - meanAbsGap * 1.6));
}

/* ---------- "AI" analysis ---------- */

export type AiAnalysis = {
  summary: string;
  strengths: { slug: string; name: string; matchIndex: number }[];
  focus: { slug: string; name: string; matchIndex: number }[];
  reportCount: number;
  overallMatchMark: number;
  overallMatchIndex: number;
  overallTestIndex: number;
  consistency: number;
  alignmentHeadline: string;
};

export function getAiAnalysis(refereeId: string, season: Season): AiAnalysis {
  const referee = getRefereeById(refereeId);
  const reports = getObserverReports(refereeId, season);
  const comparison = getComparison(refereeId, season);

  const ranked = [...comparison].sort((a, b) => b.matchIndex - a.matchIndex);
  const strengths = ranked
    .slice(0, 2)
    .map((c) => ({ slug: c.slug, name: c.name, matchIndex: c.matchIndex }));
  const focus = ranked
    .slice(-2)
    .reverse()
    .map((c) => ({ slug: c.slug, name: c.name, matchIndex: c.matchIndex }));

  const overallMatchMark = getSeasonMatchAverage(refereeId, season);
  const overallMatchIndex = matchMarkToIndex(overallMatchMark);
  const overallTestIndex =
    comparison.reduce((s, c) => s + c.testIndex, 0) / (comparison.length || 1);
  const consistency = getConsistencyScore(refereeId, season);

  const testsAhead = comparison.filter((c) => c.alignment === "tests-ahead").length;
  const matchesAhead = comparison.filter((c) => c.alignment === "matches-ahead").length;

  let alignmentHeadline: string;
  if (consistency >= 85) {
    alignmentHeadline = "Match performance and test results are strongly aligned.";
  } else if (testsAhead > matchesAhead) {
    alignmentHeadline =
      "Test knowledge runs ahead of match application — the theory isn't fully translating to the pitch yet.";
  } else if (matchesAhead > testsAhead) {
    alignmentHeadline =
      "Match application runs ahead of the tests — strong on the pitch; the platform tests can catch up.";
  } else {
    alignmentHeadline = "A mixed picture between match performance and test results.";
  }

  const name = referee?.name.split(" ")[0] ?? "This referee";
  const summary =
    `Across ${reports.length} observer reports in ${season}, ${name} averaged ` +
    `${overallMatchMark.toFixed(1)} on match day (index ${Math.round(overallMatchIndex)}/100). ` +
    `Observers most consistently praise ${strengths[0].name.toLowerCase()} and ` +
    `${strengths[1].name.toLowerCase()}, while ${focus[0].name.toLowerCase()} is the recurring ` +
    `development theme. ${alignmentHeadline}`;

  return {
    summary,
    strengths,
    focus,
    reportCount: reports.length,
    overallMatchMark,
    overallMatchIndex,
    overallTestIndex,
    consistency,
    alignmentHeadline,
  };
}

export const RATING_META: Record<Rating, { symbol: string; label: string; class: string }> = {
  plus: { symbol: "+", label: "Above expected", class: "bg-[#22c55e]/15 text-[#4ade80] border-[#22c55e]/30" },
  expected: { symbol: "✓", label: "Expected", class: "bg-dark-600/60 text-text-secondary border-dark-500" },
  minus: { symbol: "−", label: "To improve", class: "bg-[#f59e0b]/15 text-[#fbbf24] border-[#f59e0b]/30" },
};

export function formatReportDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export const OBSERVER_SEASONS = SEASONS;
