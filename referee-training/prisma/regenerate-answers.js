/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Comprehensive answer regeneration script for ALL LOTG questions.
 *
 * Strategy:
 * 1. Load canonical answers from source files (parsed_questions.json, import-ifab-faqs.js)
 * 2. Match DB questions by normalised text
 * 3. For matches → use canonical answers verbatim
 * 4. For non-matches → generate high-quality answers from the IFAB explanation
 *
 * Usage: node prisma/regenerate-answers.js
 */

const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

// ─── helpers ───────────────────────────────────────────────────────
function norm(text) {
  return (text || "")
    .replace(/\r\n/g, " ")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// ─── 1. Build canonical lookup ─────────────────────────────────────
function loadCanonicalAnswers() {
  const lookup = new Map(); // normalisedText → [{label, isCorrect}, ...]

  // (a) parsed_questions.json
  const pqPath = path.join(__dirname, "parsed_questions.json");
  if (fs.existsSync(pqPath)) {
    const pqs = JSON.parse(fs.readFileSync(pqPath, "utf8"));
    for (const q of pqs) {
      lookup.set(norm(q.text), q.answerOptions);
    }
    console.log(`  parsed_questions.json: ${pqs.length} canonical questions`);
  }

  // (b) import-ifab-faqs.js  –  extract the array with eval
  const faqPath = path.join(__dirname, "import-ifab-faqs.js");
  if (fs.existsSync(faqPath)) {
    const src = fs.readFileSync(faqPath, "utf8");
    const m = src.match(/const ifabFAQs = (\[[\s\S]*?\]);/);
    if (m) {
      try {
        const faqs = eval(m[1]);
        for (const q of faqs) {
          lookup.set(
            norm(q.text),
            q.answers.map((a) => ({ label: a.label, isCorrect: a.isCorrect }))
          );
        }
        console.log(`  import-ifab-faqs.js : ${faqs.length} canonical questions`);
      } catch (e) {
        console.error("  Could not parse ifabFAQs:", e.message);
      }
    }
  }

  // (c) seed.js  –  very small, handle inline
  const seedPath = path.join(__dirname, "seed.js");
  if (fs.existsSync(seedPath)) {
    const seedSrc = fs.readFileSync(seedPath, "utf8");
    // Extract lotgQuestions array by finding its bounds
    const start = seedSrc.indexOf("const lotgQuestions = [");
    if (start !== -1) {
      let depth = 0;
      let end = start + "const lotgQuestions = ".length;
      for (let i = end; i < seedSrc.length; i++) {
        if (seedSrc[i] === "[") depth++;
        if (seedSrc[i] === "]") depth--;
        if (depth === 0) { end = i + 1; break; }
      }
      try {
        const arr = eval(seedSrc.substring(start + "const lotgQuestions = ".length, end));
        for (const q of arr) {
          lookup.set(
            norm(q.text),
            q.answers.map((a) => ({ label: a.label, isCorrect: a.isCorrect }))
          );
        }
        console.log(`  seed.js             : ${arr.length} canonical questions`);
      } catch (e) {
        console.error("  Could not parse seed questions:", e.message);
      }
    }
  }

  console.log(`  Total canonical     : ${lookup.size} unique questions\n`);
  return lookup;
}

// ─── 2. Explanation parser ─────────────────────────────────────────
function parseExplanation(explanation, questionText) {
  const e = norm(explanation);
  const q = norm(questionText);

  const result = {
    restart: null,       // 'Direct free kick', 'Indirect free kick', 'Penalty kick', etc.
    card: null,          // 'yellow', 'red', 'none_explicit'
    cardReason: null,    // 'reckless', 'DOGSO', 'SFP', 'VC', 'dissent', 'USB', etc.
    goalOutcome: null,   // 'awarded', 'disallowed'
    isYesNo: null,       // 'yes', 'no', null
    noSanction: false,
    retaken: null,       // 'penalty kick retaken', 'free kick retaken', etc.
    special: null,       // 'play continues', 'abandon', etc.
    conditions: [],      // additional context tags
  };

  // ── YES/NO ──
  if (e.match(/^yes[.,;: ]/)) result.isYesNo = "yes";
  else if (e.match(/^no[.,;: ]/)) result.isYesNo = "no";
  else if (e.match(/^it is (not |un)?(allowed|permitted)/)) {
    result.isYesNo = e.includes("not ") || e.includes("un") ? "no" : "yes";
  }

  // ── GOAL OUTCOME ──
  if (e.includes("disallow") || e.includes("goal is not awarded") ||
      e.includes("no goal") || e.includes("goal cannot be scored") ||
      e.includes("goal must not") || (e.includes("goal") && e.includes("not awarded"))) {
    result.goalOutcome = "disallowed";
  } else if (e.includes("goal is awarded") || e.includes("awards the goal") ||
             e.includes("the goal stands") || e.includes("the goal is valid") ||
             (e.includes("awards") && e.includes("goal") && !e.includes("not")) ||
             (e.includes("referee awards the goal"))) {
    result.goalOutcome = "awarded";
  }

  // ── RESTART ──
  if (e.includes("penalty kick") && !e.includes("kicks from the penalty mark") &&
      (e.includes("awards a penalty") || e.includes("award a penalty") ||
       e.includes("penalty kick is awarded") || e.includes("awards a penalty kick") ||
       e.includes("the restart is a penalty") || e.includes("penalty kick to"))) {
    result.restart = "Penalty kick";
  }
  if (!result.restart && (e.includes("awards an indirect free kick") || e.includes("award an indirect free kick") ||
      e.includes("indirect free kick is awarded") || e.includes("indirect free kick to") ||
      (e.includes("indirect free kick") && (e.includes("awards") || e.includes("awarded") || e.includes("restart"))))) {
    result.restart = "Indirect free kick";
  }
  if (!result.restart && (e.includes("awards a direct free kick") || e.includes("award a direct free kick") ||
      e.includes("direct free kick is awarded") || e.includes("direct free kick to") ||
      e.includes("direct free kick on the boundary") ||
      (e.includes("direct free kick") && (e.includes("awards") || e.includes("awarded") || e.includes("restart"))))) {
    result.restart = "Direct free kick";
  }
  if (!result.restart && (e.includes("dropped ball") && (e.includes("restart") || e.includes("restarted") || e.includes("play is stopped")))) {
    result.restart = "Dropped ball";
  }
  if (!result.restart && (e.includes("corner kick is awarded") || e.includes("awards a corner") || e.includes("restarted with a corner"))) {
    result.restart = "Corner kick";
  }
  if (!result.restart && (e.includes("goal kick is awarded") || e.includes("awards a goal kick") || e.includes("restarted with a goal kick"))) {
    result.restart = "Goal kick";
  }

  // ── RETAKEN ──
  if (e.includes("penalty kick is retaken") || e.includes("penalty is retaken") || e.includes("kick is retaken")) {
    result.retaken = "Penalty kick retaken";
  } else if (e.includes("free kick is retaken") || e.includes("retakes the free kick")) {
    result.retaken = "Free kick retaken";
  } else if (e.includes("throw-in is retaken") || e.includes("retaken by") && e.includes("throw")) {
    result.retaken = "Throw-in retaken";
  } else if (e.includes("retaken") && e.includes("kick")) {
    result.retaken = "Kick retaken";
  }

  // ── DISCIPLINARY ──
  // Red card
  if (e.includes("sent off") || e.includes("sending-off") || e.includes("red card") ||
      e.includes("sends off")) {
    if (!e.includes("not sent off") && !e.includes("is not sent off")) {
      result.card = "red";
      if (e.includes("violent conduct")) result.cardReason = "violent conduct";
      else if (e.includes("serious foul play") || e.includes("excessive force")) result.cardReason = "serious foul play";
      else if (e.includes("obvious goal-scoring opportunity") || e.includes("dogso")) result.cardReason = "DOGSO";
      else if (e.includes("second caution") || e.includes("second yellow")) result.cardReason = "second caution";
      else if (e.includes("offensive") || e.includes("insulting") || e.includes("abusive")) result.cardReason = "offensive language";
      else if (e.includes("biting") || e.includes("spitting")) result.cardReason = "violent conduct";
    }
  }
  // Yellow card (check after red to avoid false positives)
  if (!result.card && (e.includes("cautioned") || e.includes("caution") || e.includes("yellow card"))) {
    if (!e.includes("not cautioned") && !e.includes("no caution") &&
        !e.includes("second caution")) {
      result.card = "yellow";
      if (e.includes("reckless")) result.cardReason = "reckless challenge";
      else if (e.includes("unsporting behaviour") || e.includes("unsporting behavior")) result.cardReason = "unsporting behaviour";
      else if (e.includes("dissent")) result.cardReason = "dissent";
      else if (e.includes("delaying the restart") || e.includes("delaying play")) result.cardReason = "delaying the restart of play";
      else if (e.includes("entering") && e.includes("without permission")) result.cardReason = "entering without permission";
      else if (e.includes("simulation") || e.includes("diving")) result.cardReason = "simulation";
      else if (e.includes("handball") || e.includes("hand")) result.cardReason = "unsporting behaviour";
      else if (e.includes("attempt to play the ball") || e.includes("genuine attempt")) result.cardReason = "DOGSO with genuine attempt";
      else if (e.includes("failing to respect") || e.includes("required distance")) result.cardReason = "failing to respect the required distance";
      else result.cardReason = "unsporting behaviour";
    }
  }

  // ── NO SANCTION ──
  if (e.includes("no disciplinary sanction") || e.includes("no sanction") ||
      e.includes("not cautioned") || e.includes("no card") ||
      e.includes("no disciplinary action") || e.includes("not a yellow card") ||
      e.includes("not punished") || e.includes("there is no infringement")) {
    result.noSanction = true;
  }

  // ── PLAY CONTINUES ──
  if (!result.restart && !result.goalOutcome && !result.retaken) {
    if (e.includes("play continues") || e.includes("allows play to continue") ||
        e.includes("play on") || e.includes("the referee allows play") ||
        e.includes("no offence") || e.includes("not an offence") ||
        e.includes("no foul")) {
      result.special = "play continues";
    }
  }

  // ── CONDITIONS ──
  if (e.includes("inside the penalty area") || e.includes("in the penalty area")) result.conditions.push("inside_pa");
  if (e.includes("outside the penalty area")) result.conditions.push("outside_pa");
  if (e.includes("offside")) result.conditions.push("offside");
  if (e.includes("handball") || e.includes("hand")) result.conditions.push("handball");
  if (e.includes("obvious goal-scoring opportunity") || e.includes("dogso")) result.conditions.push("dogso");
  if (e.includes("genuine attempt to play the ball")) result.conditions.push("genuine_attempt");
  if (e.includes("reckless")) result.conditions.push("reckless");
  if (e.includes("careless") && !e.includes("reckless")) result.conditions.push("careless");
  if (e.includes("excessive force") || e.includes("serious foul play")) result.conditions.push("sfp");
  if (e.includes("violent conduct")) result.conditions.push("vc");
  if (e.includes("advantage")) result.conditions.push("advantage");

  return result;
}

// ─── 3. Correct answer builder ─────────────────────────────────────
function capitalize(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildCorrectAnswer(parsed, explanation) {
  const e = norm(explanation);
  const parts = [];

  // Yes/No
  if (parsed.isYesNo === "yes") {
    const yesMatch = e.match(/^yes[.,;:]?\s*(.{10,140}?)(?:\.\s|$)/);
    if (yesMatch) return "Yes; " + yesMatch[1].charAt(0).toLowerCase() + yesMatch[1].slice(1);
    return "Yes";
  }
  if (parsed.isYesNo === "no") {
    const noMatch = e.match(/^no[.,;:]?\s*(.{10,140}?)(?:\.\s|$)/);
    if (noMatch) return "No; " + noMatch[1].charAt(0).toLowerCase() + noMatch[1].slice(1);
    return "No";
  }

  // Goal outcome
  if (parsed.goalOutcome === "awarded") {
    parts.push("Goal awarded");
    // If goal awarded, no restart is needed (only card may follow)
  } else if (parsed.goalOutcome === "disallowed") {
    parts.push("Goal disallowed");
    // Restart applies after disallowed goal
    if (parsed.restart) parts.push(parsed.restart);
  } else {
    // No goal context — restart or retaken
    if (parsed.retaken && !parsed.restart) parts.push(parsed.retaken);
    if (parsed.restart) parts.push(parsed.restart);
  }

  // Disciplinary
  if (parsed.card === "red") {
    const reason = parsed.cardReason || "sending-off offence";
    parts.push(`Sending-off (red card) for ${reason}`);
  } else if (parsed.card === "yellow") {
    const reason = parsed.cardReason || "unsporting behaviour";
    parts.push(`Caution (yellow card) for ${reason}`);
  } else if (parsed.noSanction && parts.length > 0) {
    parts.push("No disciplinary sanction");
  }

  if (parts.length > 0) {
    let answer = parts.join("; ");
    // If the answer is very short, try to add context from the explanation
    if (answer.length < 35) {
      const sentences = e.split(/\.\s+/);
      for (const s of sentences) {
        if (s.length < 10) continue;
        // Find a sentence with a "because" or reason
        if (s.includes("because") || s.includes("as the") || s.includes("since") ||
            s.includes("as it") || s.includes("even if") || s.includes("regardless") ||
            s.includes("not permitted") || s.includes("is permitted") || s.includes("cannot")) {
          let reason = s.trim();
          // Extract just the reason clause if possible
          const becauseMatch = reason.match(/(because|as |since |even if |regardless ).{10,100}/i);
          if (becauseMatch) {
            answer += "; " + becauseMatch[0].charAt(0).toLowerCase() + becauseMatch[0].slice(1);
          } else if (reason.length < 120) {
            answer += "; " + reason.charAt(0).toLowerCase() + reason.slice(1);
          }
          break;
        }
      }
    }
    // Ensure first character is capitalised
    return capitalize(answer);
  }

  // Play continues / special
  if (parsed.special === "play continues") {
    return "Play continues; no offence has been committed";
  }

  // ── Enhanced fallback: extract key ruling from explanation ──
  // Try to get the most informative sentence
  const sentences = e.split(/\.\s+/);
  for (const s of sentences) {
    // Skip very short or vague sentences
    if (s.length < 15) continue;
    // Prefer sentences that contain action words
    if (s.includes("must") || s.includes("should") || s.includes("is awarded") ||
        s.includes("the referee") || s.includes("is permitted") || s.includes("not permitted") ||
        s.includes("is required") || s.includes("the player") || s.includes("the team")) {
      let result = capitalize(s.trim());
      // Truncate if too long
      if (result.length > 160) result = result.substring(0, 157) + "...";
      return result;
    }
  }

  // Last resort: first sentence
  if (sentences[0] && sentences[0].length >= 10) {
    let result = capitalize(sentences[0].trim());
    if (result.length > 160) result = result.substring(0, 157) + "...";
    return result;
  }

  return capitalize(e.substring(0, Math.min(e.length, 140)));
}

// ─── 4. Distractor generator ──────────────────────────────────────
function generateDistractors(parsed, correctAnswer, explanation) {
  const e = norm(explanation);
  const cLower = correctAnswer.toLowerCase();
  const pool = [];

  // ── Goal-related distractors ──
  if (parsed.goalOutcome === "awarded") {
    pool.push(
      "Goal disallowed; indirect free kick to the defending team",
      "Goal disallowed; the referee must stop play and restart with a dropped ball",
      "Goal disallowed; direct free kick to the defending team"
    );
    if (!cLower.includes("yellow")) pool.push("Goal awarded; caution (yellow card) the scorer for unsporting behaviour");
    if (!cLower.includes("red")) pool.push("Goal awarded; sending-off (red card) involved player");
    pool.push("Goal disallowed; penalty kick to the defending team");
  }
  if (parsed.goalOutcome === "disallowed") {
    pool.push(
      "Goal awarded; play continues",
      "Goal awarded; no offence has been committed"
    );
    if (parsed.card === "yellow") pool.push("Goal disallowed; sending-off (red card) instead of caution");
    if (parsed.card === "red") pool.push("Goal disallowed; caution (yellow card) instead of sending-off");
    if (parsed.restart === "Indirect free kick") {
      pool.push("Goal disallowed; direct free kick to the defending team");
      pool.push("Goal disallowed; dropped ball");
    }
    if (parsed.restart === "Direct free kick") {
      pool.push("Goal disallowed; indirect free kick");
      pool.push("Goal disallowed; penalty kick");
    }
  }

  // ── Restart-related distractors ──
  if (parsed.restart) {
    const otherRestarts = ["Direct free kick", "Indirect free kick", "Penalty kick",
      "Corner kick", "Goal kick", "Dropped ball"];
    for (const r of otherRestarts) {
      if (!cLower.includes(r.toLowerCase())) {
        pool.push(r + (parsed.card ? "; no disciplinary sanction" : ""));
      }
    }
    // Wrong card with right restart
    if (parsed.card === "yellow") {
      pool.push(`${parsed.restart}; sending-off (red card) for the offence`);
      pool.push(`${parsed.restart}; no disciplinary sanction is required`);
    } else if (parsed.card === "red") {
      pool.push(`${parsed.restart}; caution (yellow card) only`);
      pool.push(`${parsed.restart}; no disciplinary sanction is required`);
    } else if (!parsed.card && !parsed.noSanction) {
      pool.push(`${parsed.restart}; caution (yellow card) for unsporting behaviour`);
      pool.push(`${parsed.restart}; sending-off (red card) for the offence`);
    }
    // Play continues as distractor
    pool.push("Play continues; no offence has been committed");
  }

  // ── Card-only distractors ──
  if (parsed.card === "yellow" && !parsed.restart && !parsed.goalOutcome) {
    pool.push("Sending-off (red card) for the offence");
    pool.push("Verbal warning only; no card is necessary");
    pool.push("No disciplinary sanction; the behaviour is not an offence");
    pool.push("Indirect free kick; sending-off (red card)");
  }
  if (parsed.card === "red" && !parsed.restart && !parsed.goalOutcome) {
    pool.push("Caution (yellow card) for unsporting behaviour");
    pool.push("Verbal warning only; no card is necessary");
    pool.push("No disciplinary sanction; the behaviour does not warrant a card");
    pool.push("Direct free kick; caution (yellow card)");
  }

  // ── Yes/No distractors ──
  if (parsed.isYesNo === "yes") {
    pool.push("No; this is not permitted under the Laws of the Game");
    pool.push("No; only with the referee's express permission");
    pool.push("Only under specific conditions determined by the referee");
    pool.push("Only at half-time or before the start of the match");
  }
  if (parsed.isYesNo === "no") {
    pool.push("Yes; this is permitted under the Laws of the Game");
    pool.push("Yes; provided the referee gives permission");
    pool.push("Yes; but only if both team captains agree");
    pool.push("At the referee's discretion depending on the circumstances");
  }

  // ── Play continues distractors ──
  if (parsed.special === "play continues") {
    pool.push(
      "Indirect free kick to the opposing team",
      "Direct free kick to the opposing team",
      "Caution (yellow card) for unsporting behaviour; indirect free kick",
      "Dropped ball from where the ball was when play was stopped",
      "Sending-off (red card) for the offence"
    );
  }

  // ── Retaken distractors ──
  if (parsed.retaken) {
    pool.push("Play continues; the restart was valid");
    pool.push("Indirect free kick to the opposing team");
    pool.push("Direct free kick to the opposing team");
    if (parsed.card) pool.push(`${parsed.retaken}; no disciplinary sanction`);
    else pool.push(`${parsed.retaken}; caution (yellow card) for unsporting behaviour`);
  }

  // ── Offside-specific ──
  if (parsed.conditions.includes("offside")) {
    pool.push("Goal awarded; the player was not in an offside position");
    pool.push("Goal awarded; the attacker did not interfere with play");
    pool.push("Direct free kick for the offside offence");
    pool.push("Play continues; the player was not actively involved");
  }

  // ── DOGSO-specific ──
  if (parsed.conditions.includes("dogso")) {
    if (parsed.card === "yellow") {
      pool.push("Penalty kick; sending-off (red card) for DOGSO — no genuine attempt exception applies");
    }
    if (parsed.card === "red") {
      pool.push("Penalty kick; caution (yellow card) only — genuine attempt to play the ball");
    }
    pool.push("Penalty kick; no disciplinary sanction");
  }

  // ── General fallback pool ──
  pool.push(
    "Direct free kick; caution (yellow card) for unsporting behaviour",
    "Indirect free kick; no disciplinary sanction",
    "Penalty kick; sending-off (red card)",
    "Dropped ball from where the ball was when play was stopped",
    "Play continues; no offence has been committed",
    "Corner kick to the attacking team",
    "Goal kick to the defending team"
  );

  // ── Filter, dedupe, select ──
  const filtered = pool.filter((d) => {
    const dLower = d.toLowerCase().trim();
    if (dLower === cLower) return false;
    // Avoid distractors that are substrings of correct or vice versa
    if (cLower.length > 15 && dLower.includes(cLower)) return false;
    if (dLower.length > 15 && cLower.includes(dLower)) return false;
    // Avoid exact semantic overlap (same first 20 chars)
    if (dLower.substring(0, 20) === cLower.substring(0, 20) && dLower.length < cLower.length + 5) return false;
    return true;
  });

  const unique = [...new Set(filtered)];
  // Shuffle
  for (let i = unique.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unique[i], unique[j]] = [unique[j], unique[i]];
  }

  return unique.slice(0, 3);
}

// ─── 5. Full answer generator ─────────────────────────────────────
function generateAnswers(questionText, explanation) {
  const parsed = parseExplanation(explanation, questionText);
  const correct = buildCorrectAnswer(parsed, explanation);
  let distractors = generateDistractors(parsed, correct, explanation);

  // Ensure we always have 3 distractors
  const fallbacks = [
    "Indirect free kick; no disciplinary sanction",
    "Direct free kick; caution (yellow card)",
    "Penalty kick; sending-off (red card)",
    "Dropped ball for the team in possession",
    "Play continues; no offence committed",
    "Corner kick to the attacking team",
    "Goal kick to the defending team",
  ];
  let fi = 0;
  while (distractors.length < 3 && fi < fallbacks.length) {
    if (!distractors.includes(fallbacks[fi]) && fallbacks[fi].toLowerCase() !== correct.toLowerCase()) {
      distractors.push(fallbacks[fi]);
    }
    fi++;
  }
  distractors = distractors.slice(0, 3);

  // Build options array with correct in a random position
  const options = [
    { label: correct, isCorrect: true },
    ...distractors.map((d) => ({ label: d, isCorrect: false })),
  ];
  // Shuffle
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return options;
}

// ─── 6. Main execution ────────────────────────────────────────────
async function main() {
  console.log("=== LOTG Answer Regeneration ===\n");
  console.log("Loading canonical answers from source files...");
  const canonical = loadCanonicalAnswers();

  console.log("Fetching all LOTG_TEXT questions from database...");
  const dbQuestions = await prisma.question.findMany({
    where: { type: "LOTG_TEXT" },
    include: { answerOptions: true },
    orderBy: { createdAt: "asc" },
  });
  console.log(`Found ${dbQuestions.length} questions in database.\n`);

  let canonicalUpdated = 0;
  let generatedUpdated = 0;
  let errorCount = 0;

  for (const dbQ of dbQuestions) {
    const key = norm(dbQ.text);
    let newAnswers;

    // Try canonical match first
    const canonicalMatch = canonical.get(key);
    if (canonicalMatch && canonicalMatch.length === 4) {
      const correctCount = canonicalMatch.filter((a) => a.isCorrect).length;
      if (correctCount === 1) {
        newAnswers = canonicalMatch;
        canonicalUpdated++;
      }
    }

    // Fall back to generated answers
    if (!newAnswers) {
      newAnswers = generateAnswers(dbQ.text, dbQ.explanation);
      generatedUpdated++;
    }

    // Validate
    if (newAnswers.length !== 4 || newAnswers.filter((a) => a.isCorrect).length !== 1) {
      console.error(`  SKIP: Invalid answers for "${dbQ.text.substring(0, 50)}..." (${newAnswers.length} opts, ${newAnswers.filter((a) => a.isCorrect).length} correct)`);
      errorCount++;
      continue;
    }

    try {
      await prisma.$transaction(async (tx) => {
        await tx.answerOption.deleteMany({ where: { questionId: dbQ.id } });
        await tx.question.update({
          where: { id: dbQ.id },
          data: {
            answerOptions: {
              create: newAnswers.map((opt, idx) => ({
                label: opt.label,
                code: `OPT_${idx}`,
                isCorrect: opt.isCorrect,
                order: idx,
              })),
            },
          },
        });
      });
    } catch (err) {
      console.error(`  ERROR: ${dbQ.id}: ${err.message}`);
      errorCount++;
    }

    const total = canonicalUpdated + generatedUpdated;
    if (total % 100 === 0) console.log(`  Progress: ${total} / ${dbQuestions.length}...`);
  }

  console.log("\n=== Results ===");
  console.log(`Canonical (from source files): ${canonicalUpdated}`);
  console.log(`Generated (from explanation) : ${generatedUpdated}`);
  console.log(`Errors/skipped              : ${errorCount}`);
  console.log(`Total questions             : ${dbQuestions.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
