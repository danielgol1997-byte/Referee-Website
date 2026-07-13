/**
 * Placeholder data for the Statistics mock-up.
 * Deterministic (seeded) so the UI is stable across reloads.
 * Figures are taken from the UEFA concept deck (slides 49-62).
 */

import { codeForCountry } from "@/lib/countries";

export type StatCategory = {
  name: string;
  slug: string;
  short: string;
  /** Site-wide answer distribution: [correct, partial, incorrect] (percent) */
  distribution: [number, number, number];
};

export const STAT_CATEGORIES: StatCategory[] = [
  { name: "Challenges", slug: "challenges", short: "CHA", distribution: [40, 45, 15] },
  { name: "Offside", slug: "offside", short: "OFF", distribution: [25, 45, 30] },
  { name: "DOGSO/SPA", slug: "dogso-spa", short: "DOG", distribution: [50, 30, 20] },
  { name: "Simulation", slug: "simulation", short: "SIM", distribution: [45, 45, 10] },
  { name: "Teamwork", slug: "teamwork", short: "TEA", distribution: [25, 35, 40] },
  { name: "Dissent", slug: "dissent", short: "DIS", distribution: [20, 65, 15] },
  { name: "Handball", slug: "handball", short: "HAN", distribution: [30, 35, 35] },
  { name: "PAI", slug: "pai", short: "PAI", distribution: [10, 45, 45] },
  { name: "Laws of the Game", slug: "laws-of-the-game", short: "LOTG", distribution: [40, 45, 15] },
];

export const COUNTRY_FLAGS: Record<string, string> = {
  Denmark: "🇩🇰",
  Poland: "🇵🇱",
  Italy: "🇮🇹",
  "Czech Republic": "🇨🇿",
  Germany: "🇩🇪",
  Spain: "🇪🇸",
  Estonia: "🇪🇪",
  Romania: "🇷🇴",
  Slovakia: "🇸🇰",
  Greece: "🇬🇷",
  Belgium: "🇧🇪",
};

/** Fitness assessment bands, best to worst. */
export type FitnessLevel =
  | "Excellent"
  | "Very Good"
  | "Good"
  | "Average"
  | "Below Average"
  | "Poor";

export const FITNESS_LEVELS: {
  label: FitnessLevel;
  text: string;
  badge: string;
}[] = [
  { label: "Excellent", text: "text-[#4ade80]", badge: "bg-[#22c55e]/15 text-[#4ade80] border-[#22c55e]/30" },
  { label: "Very Good", text: "text-cyan-500", badge: "bg-cyan-500/15 text-cyan-500 border-cyan-500/30" },
  { label: "Good", text: "text-[#a3e635]", badge: "bg-[#a3e635]/15 text-[#a3e635] border-[#a3e635]/30" },
  { label: "Average", text: "text-[#fbbf24]", badge: "bg-[#f59e0b]/15 text-[#fbbf24] border-[#f59e0b]/30" },
  { label: "Below Average", text: "text-[#fb923c]", badge: "bg-[#f97316]/15 text-[#fb923c] border-[#f97316]/30" },
  { label: "Poor", text: "text-[#f87171]", badge: "bg-[#ef4444]/15 text-[#f87171] border-[#ef4444]/30" },
];

export function fitnessLevelMeta(label: FitnessLevel) {
  return FITNESS_LEVELS.find((f) => f.label === label) ?? FITNESS_LEVELS[2];
}

/** International tournaments a referee accumulates appearances in. */
export const TOURNAMENTS = [
  { key: "UCL", name: "Champions League" },
  { key: "UEL", name: "Europa League" },
  { key: "UECL", name: "Conference League" },
  { key: "EURO", name: "European Championship" },
  { key: "WC", name: "World Cup" },
] as const;

export type TournamentKey = (typeof TOURNAMENTS)[number]["key"];

/** Seasons available in the mock, newest first. */
export const SEASONS = ["2025/26", "2024/25", "2023/24"] as const;
export type Season = (typeof SEASONS)[number];
export const CURRENT_SEASON: Season = "2025/26";

/** Reference "now" for the mock (keeps server/client render identical). */
export const MOCK_CURRENT_YEAR = 2026;

/**
 * The mock referee that stands in for a logged-in REFEREE-role user ("me").
 * Swap for a real user→referee mapping when wiring live data.
 */
export const CURRENT_USER_REFEREE_ID = "lars-andersen";

export type RefereeProfile = {
  age: number;
  heightCm: number;
  weightKg: number;
  bodyFatPct: number;
  fitnessLevel: FitnessLevel;
  internationalSince: number;
  tournaments: Record<TournamentKey, number>;
};

/** International confederations a referee may additionally belong to. */
export const CONFERENCES = ["UEFA", "FIFA"] as const;
export type Conference = (typeof CONFERENCES)[number];

export type StatReferee = {
  id: string;
  name: string;
  country: string;
  /**
   * ISO alpha-2 country code standing in for the referee's federation, so the
   * mock demonstrates per-FA division until real stats are wired.
   */
  associationCountryCode: string | null;
  /**
   * International confederation this referee also belongs to (in addition to
   * their national federation), mirroring `Association.isInternational`.
   */
  conference: Conference | null;
  level: string;
  /** Average score per category slug (0-10 scale) */
  scores: Record<string, number>;
  profile: RefereeProfile;
  /** Real photo (Cloudinary URL). Undefined until uploaded. */
  photoUrl?: string;
  /** AI-generated hologram still image (Cloudinary URL). Used as table thumbnail. */
  hologramUrl?: string;
  /** AI-generated animated video clip (Cloudinary URL, mp4). Shown on profile page. */
  videoUrl?: string;
};

// Average marks per category, from the concept deck (slide 52).
// Column order there: Challenges, Handball, DOGSO/SPA, Simulation, PAI, Teamwork, Dissent, Offside, LOTG
const rawReferees: Array<[string, string, string, Conference | null, number[]]> = [
  ["Lars Andersen", "Denmark", "Elite", "UEFA", [9.3, 7.6, 8.4, 8.9, 9.25, 8.8, 9.1, 9.0, 9.0]],
  ["Mateusz Kowalczyk", "Poland", "Category 1", null, [9.0, 7.25, 6.8, 8.25, 7.4, 8.0, 8.7, 8.85, 8.8]],
  ["Giovanni Bianchi", "Italy", "Elite", "UEFA", [8.8, 9.2, 8.75, 9.4, 8.75, 9.45, 7.9, 8.7, 9.55]],
  ["Pavel Novák", "Czech Republic", "Category 1", null, [8.75, 7.5, 7.7, 8.4, 7.9, 7.7, 8.75, 8.15, 9.45]],
  ["Andreas Schmidt", "Germany", "Category 1", "UEFA", [8.5, 7.0, 9.3, 7.55, 8.85, 8.4, 8.55, 7.9, 9.15]],
  ["Juan García Pérez", "Spain", "Elite", "FIFA", [8.2, 9.4, 7.8, 8.0, 8.5, 7.8, 8.25, 9.45, 8.6]],
  ["Kristjan Mägi", "Estonia", "Category 2", null, [8.0, 9.2, 7.3, 7.0, 7.6, 7.55, 7.8, 9.3, 8.5]],
  ["Mihai Dumitrescu", "Romania", "Category 1", null, [7.8, 8.8, 9.0, 7.25, 9.0, 9.65, 7.4, 9.2, 7.9]],
  ["Tomáš Horváth", "Slovakia", "Category 2", null, [7.75, 8.75, 9.75, 7.75, 8.35, 8.7, 9.8, 8.45, 7.9]],
  ["Nikos Georgiou", "Greece", "Category 1", "UEFA", [7.5, 7.8, 8.6, 9.2, 7.3, 9.15, 9.5, 8.3, 7.8]],
  ["Erik Lambercht", "Belgium", "Elite", "UEFA", [9.1, 8.6, 9.0, 8.8, 9.3, 8.9, 8.5, 9.1, 9.2]],
];

// Bio / fitness / career, parallel to rawReferees.
// [age, heightCm, weightKg, bodyFatPct, fitnessLevel, intlSince, UCL, UEL, UECL, EURO, WC]
const rawProfiles: Array<[number, number, number, number, FitnessLevel, number, number, number, number, number, number]> = [
  [39, 184, 78, 9.2, "Excellent", 2014, 52, 38, 20, 6, 4],
  [35, 181, 76, 10.5, "Very Good", 2017, 24, 30, 26, 2, 0],
  [42, 179, 77, 10.1, "Very Good", 2012, 61, 40, 15, 8, 6],
  [37, 186, 82, 11.0, "Good", 2016, 30, 34, 28, 3, 1],
  [34, 183, 79, 9.8, "Very Good", 2018, 22, 28, 24, 1, 0],
  [40, 178, 75, 9.5, "Excellent", 2013, 55, 36, 12, 7, 5],
  [33, 185, 83, 12.3, "Good", 2019, 8, 18, 30, 0, 0],
  [36, 180, 78, 10.8, "Good", 2016, 26, 32, 27, 2, 1],
  [32, 182, 80, 11.6, "Average", 2020, 6, 15, 29, 0, 0],
  [38, 177, 76, 10.4, "Good", 2015, 28, 33, 25, 3, 1],
  [36, 182, 78, 9.6, "Excellent", 2015, 48, 35, 18, 5, 3],
];

/**
 * Referee images keyed by the generated referee `id`.
 * Add entries here as photos/holograms are generated.
 * Both fields are optional — components should fall back gracefully.
 */
export const REFEREE_IMAGES: Record<
  string,
  { photoUrl?: string; hologramUrl?: string; videoUrl?: string }
> = {
  "erik-lambercht": {
    photoUrl: "https://res.cloudinary.com/dh9glizf2/image/upload/v1783390452/referee-photos/erik-lambercht/mhbxya8f80lmbi5aapwd.webp",
    hologramUrl: "https://res.cloudinary.com/dh9glizf2/image/upload/v1783390466/referee-holograms/erik-lambercht/oeovjpssdrczg5ui2tbj.jpg",
    videoUrl: "https://res.cloudinary.com/dh9glizf2/video/upload/v1783397353/referee-videos/erik-lambercht/xof3wtfusrtnljqmtdnd.mp4",
  },
};

const deckColumnSlugs = [
  "challenges",
  "handball",
  "dogso-spa",
  "simulation",
  "pai",
  "teamwork",
  "dissent",
  "offside",
  "laws-of-the-game",
];

export const STAT_REFEREES: StatReferee[] = rawReferees.map(([name, country, level, conference, marks], idx) => {
  const scores: Record<string, number> = {};
  deckColumnSlugs.forEach((slug, i) => {
    scores[slug] = marks[i];
  });
  const [age, heightCm, weightKg, bodyFatPct, fitnessLevel, internationalSince, ucl, uel, uecl, euro, wc] =
    rawProfiles[idx];
  const id = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-");
  const images = REFEREE_IMAGES[id] ?? {};
  return {
    id,
    name,
    country,
    associationCountryCode: codeForCountry(country),
    conference,
    level,
    scores,
    profile: {
      age,
      heightCm,
      weightKg,
      bodyFatPct,
      fitnessLevel,
      internationalSince,
      tournaments: { UCL: ucl, UEL: uel, UECL: uecl, EURO: euro, WC: wc },
    },
    ...images,
  };
});

export const REFEREE_LEVELS = ["Elite", "Category 1", "Category 2"];

export function getRefereeById(id: string): StatReferee | undefined {
  return STAT_REFEREES.find((r) => r.id === id);
}

/** Which part of an admin's scope to view, when they have both. */
export type AdminScope = "federation" | "conference" | "both";

/**
 * Federation/conference-scoped referee list.
 *  - Super admins / developers see everyone (optionally narrowed to one
 *    association — national or international — and/or one rank).
 *  - FA admins see referees in their own national federation. If they're also
 *    a conference admin (their user has an international association), they
 *    additionally see that confederation's members; `scope` picks which part
 *    of that combined access to display.
 *  - Referees see only themselves.
 */
export function getScopedReferees(opts: {
  isSuperAdmin: boolean;
  isAdmin: boolean;
  associationCountryCode: string | null;
  conference: Conference | null;
  myRefereeId: string;
  /** Super-admin-only filter: narrow to a single association's country code, or a conference name. */
  filterCountryCode?: string | null;
  filterConference?: Conference | null;
  /** Which slice of a dual-scoped (federation + conference) admin's access to show. */
  scope?: AdminScope;
  /** Narrow to a single referee rank/level (Elite, Category 1, ...). */
  rank?: string | null;
}): StatReferee[] {
  let list: StatReferee[];

  if (opts.isSuperAdmin) {
    list = STAT_REFEREES;
    if (opts.filterCountryCode) {
      list = list.filter((r) => r.associationCountryCode === opts.filterCountryCode);
    } else if (opts.filterConference) {
      list = list.filter((r) => r.conference === opts.filterConference);
    }
  } else if (opts.isAdmin) {
    if (!opts.associationCountryCode && !opts.conference) return [];
    const scope = opts.scope ?? "both";
    const inFederation = opts.associationCountryCode
      ? STAT_REFEREES.filter((r) => r.associationCountryCode === opts.associationCountryCode)
      : [];
    const inConference = opts.conference
      ? STAT_REFEREES.filter((r) => r.conference === opts.conference)
      : [];
    if (scope === "federation" || !opts.conference) list = inFederation;
    else if (scope === "conference" || !opts.associationCountryCode) list = inConference;
    else {
      const seen = new Set<string>();
      list = [...inFederation, ...inConference].filter((r) =>
        seen.has(r.id) ? false : (seen.add(r.id), true)
      );
    }
  } else {
    list = STAT_REFEREES.filter((r) => r.id === opts.myRefereeId);
  }

  if (opts.rank) {
    list = list.filter((r) => r.level === opts.rank);
  }

  return list;
}

export function getTotalTournamentGames(referee: StatReferee): number {
  return Object.values(referee.profile.tournaments).reduce((sum, v) => sum + v, 0);
}

/* ---------- Deterministic pseudo-random helpers ---------- */

export function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- Derived data ---------- */

export type TestHistoryEntry = {
  date: Date;
  score: number; // integer 5-10
};

const HISTORY_LENGTH = 10;
// Fixed UTC anchor so the mock renders identically on server and client.
const HISTORY_ANCHOR = new Date(Date.UTC(2026, 5, 29)); // Mon, Jun 29 2026

/** Last 10 weekly test sessions for a referee in a category. Mean tracks the average score. */
export function getTestHistory(refereeId: string, categorySlug: string): TestHistoryEntry[] {
  const referee = STAT_REFEREES.find((r) => r.id === refereeId);
  const avg = referee?.scores[categorySlug] ?? 8;
  const rand = mulberry32(hashString(`${refereeId}:${categorySlug}`));
  const entries: TestHistoryEntry[] = [];
  for (let i = 0; i < HISTORY_LENGTH; i++) {
    const noise = (rand() - 0.5) * 3.2;
    const score = Math.max(5, Math.min(10, Math.round(avg + noise)));
    const date = new Date(HISTORY_ANCHOR);
    date.setUTCDate(date.getUTCDate() - (HISTORY_LENGTH - 1 - i) * 7);
    entries.push({ date, score });
  }
  return entries;
}

/** Number of tests a referee has taken in a category (10-16). */
export function getTestsTaken(refereeId: string, categorySlug: string): number {
  const rand = mulberry32(hashString(`tests:${refereeId}:${categorySlug}`));
  return 10 + Math.floor(rand() * 7);
}

/** [correct, partial, incorrect] percentages for a referee in a category, derived from history. */
export function getRefereeDistribution(
  refereeId: string,
  categorySlug: string
): [number, number, number] {
  const history = getTestHistory(refereeId, categorySlug);
  let correct = 0;
  let partial = 0;
  let incorrect = 0;
  for (const entry of history) {
    if (entry.score >= 9) correct++;
    else if (entry.score >= 7) partial++;
    else incorrect++;
  }
  const total = history.length;
  return [
    Math.round((correct / total) * 100),
    Math.round((partial / total) * 100),
    Math.round((incorrect / total) * 100),
  ];
}

export function getRefereeOverall(referee: StatReferee): number {
  const values = Object.values(referee.scores);
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function getCategoryAverage(
  categorySlug: string,
  referees: StatReferee[] = STAT_REFEREES
): number {
  if (referees.length === 0) return 0;
  const values = referees.map((r) => r.scores[categorySlug] ?? 0);
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function getCategoryTestsTaken(categorySlug: string): number {
  return STAT_REFEREES.reduce((sum, r) => sum + getTestsTaken(r.id, categorySlug), 0);
}

/** Weekly site-wide average trend for a category (for trend charts). */
export function getCategoryTrend(categorySlug: string): number[] {
  const perWeek: number[] = [];
  for (let week = 0; week < HISTORY_LENGTH; week++) {
    let sum = 0;
    for (const referee of STAT_REFEREES) {
      sum += getTestHistory(referee.id, categorySlug)[week].score;
    }
    perWeek.push(sum / STAT_REFEREES.length);
  }
  return perWeek;
}

/** Ranked referees for a category (highest average first). */
export function getCategoryLeaderboard(
  categorySlug: string,
  referees: StatReferee[] = STAT_REFEREES
): StatReferee[] {
  return [...referees].sort(
    (a, b) => (b.scores[categorySlug] ?? 0) - (a.scores[categorySlug] ?? 0)
  );
}

export function getTotalTests(): number {
  return STAT_CATEGORIES.reduce((sum, c) => sum + getCategoryTestsTaken(c.slug), 0);
}

export function getSiteAverage(): number {
  return (
    STAT_REFEREES.reduce((sum, r) => sum + getRefereeOverall(r), 0) / STAT_REFEREES.length
  );
}

/**
 * Platform test average for a category in a given season.
 * Current season uses the headline figure; older seasons trend slightly lower
 * (referees improve over time), with a touch of deterministic variation.
 */
export function getSeasonTestScore(
  refereeId: string,
  categorySlug: string,
  season: Season
): number {
  const referee = getRefereeById(refereeId);
  const base = referee?.scores[categorySlug] ?? 8;
  const seasonIndex = SEASONS.indexOf(season); // 0 = current
  const rand = mulberry32(hashString(`season:${refereeId}:${categorySlug}:${season}`));
  const drift = -seasonIndex * 0.25 + (rand() - 0.5) * 0.4;
  return Math.max(5, Math.min(10, base + drift));
}

export function formatScore(value: number): string {
  return value.toFixed(2);
}

export function seasonYears(season: Season): string {
  return season;
}

export function formatHistoryDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}
