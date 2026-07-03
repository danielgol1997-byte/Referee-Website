/**
 * Placeholder data for the Statistics mock-up.
 * Deterministic (seeded) so the UI is stable across reloads.
 * Figures are taken from the UEFA concept deck (slides 49-62).
 */

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
};

export type StatReferee = {
  id: string;
  name: string;
  country: string;
  level: string;
  /** Average score per category slug (0-10 scale) */
  scores: Record<string, number>;
};

// Average marks per category, from the concept deck (slide 52).
// Column order there: Challenges, Handball, DOGSO/SPA, Simulation, PAI, Teamwork, Dissent, Offside, LOTG
const rawReferees: Array<[string, string, string, number[]]> = [
  ["Lars Andersen", "Denmark", "Elite", [9.3, 7.6, 8.4, 8.9, 9.25, 8.8, 9.1, 9.0, 9.0]],
  ["Mateusz Kowalczyk", "Poland", "Category 1", [9.0, 7.25, 6.8, 8.25, 7.4, 8.0, 8.7, 8.85, 8.8]],
  ["Giovanni Bianchi", "Italy", "Elite", [8.8, 9.2, 8.75, 9.4, 8.75, 9.45, 7.9, 8.7, 9.55]],
  ["Pavel Novák", "Czech Republic", "Category 1", [8.75, 7.5, 7.7, 8.4, 7.9, 7.7, 8.75, 8.15, 9.45]],
  ["Andreas Schmidt", "Germany", "Category 1", [8.5, 7.0, 9.3, 7.55, 8.85, 8.4, 8.55, 7.9, 9.15]],
  ["Juan García Pérez", "Spain", "Elite", [8.2, 9.4, 7.8, 8.0, 8.5, 7.8, 8.25, 9.45, 8.6]],
  ["Kristjan Mägi", "Estonia", "Category 2", [8.0, 9.2, 7.3, 7.0, 7.6, 7.55, 7.8, 9.3, 8.5]],
  ["Mihai Dumitrescu", "Romania", "Category 1", [7.8, 8.8, 9.0, 7.25, 9.0, 9.65, 7.4, 9.2, 7.9]],
  ["Tomáš Horváth", "Slovakia", "Category 2", [7.75, 8.75, 9.75, 7.75, 8.35, 8.7, 9.8, 8.45, 7.9]],
  ["Nikos Georgiou", "Greece", "Category 1", [7.5, 7.8, 8.6, 9.2, 7.3, 9.15, 9.5, 8.3, 7.8]],
];

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

export const STAT_REFEREES: StatReferee[] = rawReferees.map(([name, country, level, marks]) => {
  const scores: Record<string, number> = {};
  deckColumnSlugs.forEach((slug, i) => {
    scores[slug] = marks[i];
  });
  return {
    id: name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-"),
    name,
    country,
    level,
    scores,
  };
});

export const REFEREE_LEVELS = ["Elite", "Category 1", "Category 2"];

/* ---------- Deterministic pseudo-random helpers ---------- */

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
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
// Fixed anchor so the mock renders identically on server and client.
const HISTORY_ANCHOR = new Date(2026, 5, 29); // Mon, Jun 29 2026

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
    date.setDate(date.getDate() - (HISTORY_LENGTH - 1 - i) * 7);
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

export function getCategoryAverage(categorySlug: string): number {
  const values = STAT_REFEREES.map((r) => r.scores[categorySlug] ?? 0);
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
export function getCategoryLeaderboard(categorySlug: string): StatReferee[] {
  return [...STAT_REFEREES].sort(
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

export function formatScore(value: number): string {
  return value.toFixed(2);
}

export function formatHistoryDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
