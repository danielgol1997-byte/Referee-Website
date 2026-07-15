/**
 * Performance Index — the bridge between two scoring systems that don't share
 * a scale.
 *
 * Platform *test* marks are ordinary 0–10 knowledge scores. UEFA *match* marks
 * (from observer reports) live on a compressed rubric where 8.4 means "good,
 * the expected level" and a tenth of a point is significant. Comparing the two
 * raw numbers is misleading — a test 8.4 and a match 8.4 mean very different
 * things.
 *
 * To compare them fairly, both are mapped onto a single 0–100 "Performance
 * Index" anchored so that **70 = the expected standard** on either scale.
 * Above 70 = above expectation; below 70 = development needed. Once both sit on
 * this index, the gap between a referee's theory (tests) and their pitch
 * application (match marks) becomes meaningful and directly comparable.
 */

/** The shared anchor: "meets the expected standard" on both scales. */
export const EXPECTED_INDEX = 70;

/**
 * UEFA referee match mark → index. Calibrated on the official evaluation scale:
 * 8.4 is the benchmark ("good, expected level") and maps to 70; 9.0+ is
 * excellent, 7.9/7.8 signal a clear error, 6.x is unacceptable.
 */
const MATCH_ANCHORS: [mark: number, index: number][] = [
  [6.0, 0],
  [7.0, 18],
  [7.5, 30],
  [7.8, 38],
  [7.9, 44],
  [8.0, 52],
  [8.2, 60],
  [8.3, 66],
  [8.4, 70],
  [8.5, 78],
  [8.9, 88],
  [9.0, 92],
  [10.0, 100],
];

/**
 * Platform test mark (0–10) → index. 8/10 is treated as the expected pass
 * standard and maps to 70; each further point is worth ~15 index points.
 */
const TEST_ANCHORS: [mark: number, index: number][] = [
  [0, 0],
  [5, 25],
  [6, 40],
  [7, 55],
  [8, 70],
  [9, 85],
  [10, 100],
];

function interpolate(anchors: [number, number][], value: number): number {
  const first = anchors[0];
  const last = anchors[anchors.length - 1];
  if (value <= first[0]) return first[1];
  if (value >= last[0]) return last[1];
  for (let i = 0; i < anchors.length - 1; i++) {
    const [x0, y0] = anchors[i];
    const [x1, y1] = anchors[i + 1];
    if (value >= x0 && value <= x1) {
      const t = (value - x0) / (x1 - x0);
      return y0 + t * (y1 - y0);
    }
  }
  return last[1];
}

export function matchMarkToIndex(mark: number): number {
  return Math.round(interpolate(MATCH_ANCHORS, mark));
}

export function testMarkToIndex(mark: number): number {
  return Math.round(interpolate(TEST_ANCHORS, mark));
}

/** UEFA evaluation scale bands (referees / assistant referees), for the guide. */
export const MATCH_SCALE_BANDS: { range: string; label: string; benchmark?: boolean }[] = [
  { range: "9.0 – 10", label: "Excellent performance" },
  { range: "8.5 – 8.9", label: "Very good — important decisions correctly taken" },
  { range: "8.4", label: "Good — the expected level of performance", benchmark: true },
  { range: "8.3", label: "Good, but with one area for improvement" },
  { range: "8.0 – 8.2", label: "Important areas for improvement (e.g. missed sanction)" },
  { range: "7.8 – 7.9", label: "One clear mistake on an important decision" },
  { range: "7.5 – 7.7", label: "Below expectation / poor match control" },
  { range: "7.0 – 7.4", label: "Disappointing — one or more clear mistakes" },
  { range: "6.0 – 6.9", label: "Unacceptable performance" },
];

/** UEFA evaluation scale for the Video Assistant Referee (7 = benchmark). */
export const VAR_SCALE_BANDS: { range: string; label: string; benchmark?: boolean }[] = [
  { range: "10", label: "Correctly assisted on 3+ major incidents" },
  { range: "9", label: "Correctly assisted on two major incidents" },
  { range: "8", label: "Correctly assisted on one major incident" },
  { range: "7", label: "Efficient, no obvious involvement — UEFA benchmark", benchmark: true },
  { range: "6", label: "Failed / incorrectly advised on one major incident" },
  { range: "5", label: "Failed / incorrectly advised on two major incidents" },
  { range: "4", label: "Failed / incorrectly advised on 3+ major incidents" },
];

/**
 * Which observer section a platform test category is most closely evaluated by.
 * Used to line the "relevant fields" up against each other in the comparison.
 */
export const CRITERION_SECTION: Record<string, string> = {
  challenges: "Disciplinary — Challenges & foul detection",
  handball: "Technical — Handball evaluation",
  "dogso-spa": "Disciplinary — DOGSO / stopping attacks",
  simulation: "Disciplinary — Simulation",
  dissent: "Match control — Confrontation / dissent",
  teamwork: "Team work",
  pai: "Technical — Penalty-area incidents",
  "laws-of-the-game": "Technical — Laws application",
  offside: "Technical — Offside / VAR support",
};

export type Alignment = "aligned" | "tests-ahead" | "matches-ahead";

/** Verdict from the gap between test index and match index (in index points). */
export function alignmentFor(gap: number): Alignment {
  if (gap > 8) return "tests-ahead";
  if (gap < -8) return "matches-ahead";
  return "aligned";
}

export const ALIGNMENT_META: Record<
  Alignment,
  { label: string; short: string; text: string; badge: string; dot: string }
> = {
  aligned: {
    label: "Aligned",
    short: "Aligned",
    text: "text-[#4ade80]",
    badge: "bg-[#22c55e]/15 text-[#4ade80] border-[#22c55e]/30",
    dot: "#22c55e",
  },
  "tests-ahead": {
    label: "Theory ahead of pitch",
    short: "Tests ahead",
    text: "text-cyan-500",
    badge: "bg-cyan-500/15 text-cyan-500 border-cyan-500/30",
    dot: "#00E8F8",
  },
  "matches-ahead": {
    label: "Pitch ahead of theory",
    short: "Matches ahead",
    text: "text-[#fbbf24]",
    badge: "bg-[#f59e0b]/15 text-[#fbbf24] border-[#f59e0b]/30",
    dot: "#f59e0b",
  },
};

/** Index → tone color, using the same thresholds as the mark colors (70/expected pivot). */
export function indexColor(index: number): string {
  if (index >= 85) return "#4ade80";
  if (index >= 70) return "#00E8F8";
  if (index >= 52) return "#fbbf24";
  return "#f87171";
}
