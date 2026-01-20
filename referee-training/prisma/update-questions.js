/**
 * Script to update existing incomplete questions with data from a new text file.
 * Matches questions by exact text and updates explanation, law numbers, and answer options.
 * 
 * Usage: node prisma/update-questions.js
 */

const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

// Configuration
const NEW_FILE_PATH = '/Users/daniel/Downloads/Fixed IFAB lotg Q&A.txt';
const prisma = new PrismaClient();

// Common referee decisions for generating distractors (same as before)
const COMMON_DECISIONS = [
  "Direct free kick", "Indirect free kick", "Penalty kick", "Award the goal",
  "Corner kick", "Goal kick", "Dropped ball", "Play continues",
  "Retake the restart", "Yellow card (Caution)", "Red card (Sending-off)"
];

// --- Parsing Logic (Reused from previous script) ---
function parseQuestions(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    // Split by blocks but keep content cleaner
    const blocks = content.split(/---\s+INDEX: \d+\s+---/).filter(b => b.trim().length > 0);
    
    return blocks.map((block) => {
      // 1. Extract Question
      const questionMatch = block.match(/QUESTION\s+([\s\S]*?)\s+ANSWER/);
      if (!questionMatch) return null;
      let questionText = questionMatch[1].trim();

      // 2. Extract Explanation & Law
      const answerSection = block.split('ANSWER')[1];
      if (!answerSection) return null;

      const parts = answerSection.split('Hide answer');
      let rawExplanation = parts[1] ? parts[1].trim() : parts[0].trim();

      // Find law reference lines (at the end)
      const lines = rawExplanation.split('\n');
      let explanationLines = [];
      let lawLine = "";

      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if (line === 'LAW DETAILS' || line === '') continue;
        if (line.match(/^(W )?Law \d/) || line.includes('Notes and modifications')) {
          lawLine = line + " " + lawLine;
        } else {
          explanationLines = lines.slice(0, i + 1);
          break;
        }
      }

      let explanationText = explanationLines.join('\n').trim();
      const normalizedExplanation = explanationText.replace(/\s+/g, ' ').toLowerCase();

      // 3. Extract Law Numbers
      const lawNumbers = [];
      const lawMatches = lawLine.match(/Law (\d+)/g);
      if (lawMatches) {
        lawMatches.forEach(m => {
          const num = parseInt(m.match(/\d+/)[0]);
          if (!lawNumbers.includes(num) && num >= 1 && num <= 17) {
            lawNumbers.push(num);
          }
        });
      }

      // 4. Generate Answer Options
      let correctDecision = "See explanation for correct ruling";
      if (normalizedExplanation.includes("indirect free kick")) correctDecision = "Indirect free kick";
      else if (normalizedExplanation.includes("direct free kick")) correctDecision = "Direct free kick";
      else if (normalizedExplanation.includes("penalty kick")) correctDecision = "Penalty kick";
      else if (normalizedExplanation.includes("dropped ball")) correctDecision = "Dropped ball";
      else if (normalizedExplanation.includes("corner kick")) correctDecision = "Corner kick";
      else if (normalizedExplanation.includes("goal kick")) correctDecision = "Goal kick";
      else if (normalizedExplanation.includes("retake")) correctDecision = "Retake the restart";
      else if (normalizedExplanation.includes("yellow card") || normalizedExplanation.includes("caution")) correctDecision = "Yellow card (Caution)";
      else if (normalizedExplanation.includes("red card") || normalizedExplanation.includes("sent off") || normalizedExplanation.includes("sending-off")) correctDecision = "Red card (Sending-off)";
      else if (normalizedExplanation.includes("awards the goal") || normalizedExplanation.includes("award the goal") || (normalizedExplanation.includes("goal") && !normalizedExplanation.includes("disallow") && !normalizedExplanation.includes("no goal"))) correctDecision = "Award the goal";
      else if (normalizedExplanation.includes("play continues") || normalizedExplanation.includes("play on")) correctDecision = "Play continues";

      // Distractors
      const distractors = COMMON_DECISIONS
        .filter(d => d.toLowerCase() !== correctDecision.toLowerCase())
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);

      const answerOptions = [
        { label: correctDecision, isCorrect: true },
        ...distractors.map(d => ({ label: d, isCorrect: false }))
      ];
      answerOptions.sort(() => 0.5 - Math.random()); // Shuffle

      return {
        text: questionText,
        explanation: explanationText,
        lawNumbers: lawNumbers.length > 0 ? lawNumbers : [],
        answerOptions: answerOptions
      };
    }).filter(Boolean);
  } catch (e) {
    console.error("Error parsing file:", e);
    return [];
  }
}

async function updateQuestions() {
  console.log("🚀 Starting update process...");

  // 1. Parse new file
  console.log(`Reading new file: ${NEW_FILE_PATH}`);
  const newQuestions = parseQuestions(NEW_FILE_PATH);
  console.log(`Parsed ${newQuestions.length} questions from file.`);

  // 2. Find target questions in DB
  console.log("Fetching incomplete questions from database...");
  const targetQuestions = await prisma.question.findMany({
    where: {
      OR: [
        { explanation: "" },
        { explanation: { equals: "Show answer", mode: "insensitive" } },
        {
          answerOptions: {
            some: {
              label: { contains: "See explanation for correct ruling", mode: "insensitive" }
            }
          }
        }
      ]
    },
    include: { answerOptions: true }
  });

  console.log(`Found ${targetQuestions.length} incomplete questions in DB.`);

  let updatedCount = 0;
  let notFoundCount = 0;

  // 3. Update Loop
  for (const dbQ of targetQuestions) {
    // Find match by EXACT text
    // Note: normalizing whitespace for better matching reliability
    const dbTextNormalized = dbQ.text.replace(/\s+/g, ' ').trim();
    const match = newQuestions.find(nq => nq.text.replace(/\s+/g, ' ').trim() === dbTextNormalized);

    if (match) {
      // Perform Update
      await prisma.$transaction(async (tx) => {
        // Delete old answers
        await tx.answerOption.deleteMany({
          where: { questionId: dbQ.id }
        });

        // Update question text/explanation/laws and create new answers
        await tx.question.update({
          where: { id: dbQ.id },
          data: {
            explanation: match.explanation,
            lawNumbers: match.lawNumbers,
            answerOptions: {
              create: match.answerOptions.map((opt, idx) => ({
                label: opt.label,
                code: `OPT_${idx}`,
                isCorrect: opt.isCorrect,
                order: idx,
              })),
            }
          }
        });
      });
      updatedCount++;
      if (updatedCount % 10 === 0) process.stdout.write("."); // Progress dot
    } else {
      notFoundCount++;
      // console.log(`\nNo match found for question ID ${dbQ.id}: "${dbQ.text.substring(0, 50)}..."`);
    }
  }

  console.log("\n\n✅ Update Complete!");
  console.log(`Updated: ${updatedCount}`);
  console.log(`Unmatched/Skipped: ${notFoundCount}`);
  console.log(`Total Scanned: ${targetQuestions.length}`);
}

updateQuestions()
  .catch(console.error)
  .finally(() => prisma.$disconnect());



