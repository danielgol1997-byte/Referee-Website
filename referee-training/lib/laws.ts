export const LAW_NUMBERS = Array.from({ length: 17 }, (_, idx) => idx + 1);

export const LAW_NAMES: Record<number, string> = {
  1: "The Field of Play",
  2: "The Ball",
  3: "The Players",
  4: "The Players' Equipment",
  5: "The Referee",
  6: "The Other Match Officials",
  7: "The Duration of the Match",
  8: "The Start and Restart of Play",
  9: "The Ball in and Out of Play",
  10: "Determining the Outcome of a Match",
  11: "Offside",
  12: "Fouls and Misconduct",
  13: "Free Kicks",
  14: "The Penalty Kick",
  15: "The Throw-in",
  16: "The Goal Kick",
  17: "The Corner Kick",
};

export const getLawName = (lawNumber: number): string =>
  LAW_NAMES[lawNumber] ?? "Laws of the Game";

export const formatLawLabel = (lawNumber: number): string =>
  `Law ${lawNumber} - ${getLawName(lawNumber)}`;
