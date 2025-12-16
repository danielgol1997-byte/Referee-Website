/**
 * Script to parse IFAB questions from text file
 * Usage: node prisma/parse-ifab-questions.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const INPUT_FILE = '/Users/daniel/Downloads/10 qs.txt';
const OUTPUT_FILE = 'prisma/parsed_questions.json';

// Common referee decisions for generating distractors
const COMMON_DECISIONS = [
  "Direct free kick",
  "Indirect free kick",
  "Penalty kick",
  "Award the goal",
  "Corner kick",
  "Goal kick",
  "Dropped ball",
  "Play continues",
  "Retake the restart",
  "Yellow card (Caution)",
  "Red card (Sending-off)"
];

function parseQuestions(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const blocks = content.split(/---\s+INDEX: \d+\s+---/).filter(b => b.trim().length > 0);
  
  const parsedQuestions = blocks.map((block, index) => {
    try {
      // 1. Extract Question
      const questionMatch = block.match(/QUESTION\s+([\s\S]*?)\s+ANSWER/);
      if (!questionMatch) return null;
      let questionText = questionMatch[1].trim();

      // 2. Extract Explanation & Law References
      const answerSection = block.split('ANSWER')[1];
      if (!answerSection) return null;

      // Split by "Hide answer" to get the start of explanation
      const parts = answerSection.split('Hide answer');
      let rawExplanation = parts[1] ? parts[1].trim() : parts[0].trim();

      // Find where the law reference starts (usually "W Law" or just "Law")
      // We look for the last line that looks like a law reference
      const lines = rawExplanation.split('\n');
      let explanationLines = [];
      let lawLine = "";

      // Go backwards to find law line
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if (line === 'LAW DETAILS' || line === '') continue;
        
        // Check if line looks like law reference (e.g. "W Law 8/2", "Law 12", "Notes and modifications")
        if (line.match(/^(W )?Law \d/) || line.includes('Notes and modifications')) {
          lawLine = line + " " + lawLine; // Append if multiple lines
        } else {
          // Once we hit non-law line, the rest above is explanation
          explanationLines = lines.slice(0, i + 1);
          break;
        }
      }

      let explanationText = explanationLines.join('\n').trim();

      // Normalize explanation for heuristic checking (remove newlines)
      const normalizedExplanation = explanationText.replace(/\s+/g, ' ').toLowerCase();

      // DEBUG
      if (index === 7) { // Index 8 in file is roughly the 8th block (0-indexed 7)
         console.log(`[DEBUG Index 8] Normalized: "${normalizedExplanation}"`);
      }

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
      // Heuristic: Try to find the decision in the explanation
      let correctDecision = "See explanation for correct ruling";
      
      // Simple keyword matching to guess the correct decision
      // Check longer phrases first
      if (normalizedExplanation.includes("indirect free kick")) correctDecision = "Indirect free kick";
      else if (normalizedExplanation.includes("direct free kick")) correctDecision = "Direct free kick";
      else if (normalizedExplanation.includes("penalty kick")) correctDecision = "Penalty kick";
      else if (normalizedExplanation.includes("dropped ball")) correctDecision = "Dropped ball";
      else if (normalizedExplanation.includes("corner kick")) correctDecision = "Corner kick";
      else if (normalizedExplanation.includes("goal kick")) correctDecision = "Goal kick";
      else if (normalizedExplanation.includes("retake")) correctDecision = "Retake the restart";
      else if (normalizedExplanation.includes("yellow card") || normalizedExplanation.includes("caution")) correctDecision = "Yellow card (Caution)";
      else if (normalizedExplanation.includes("red card") || normalizedExplanation.includes("sent off") || normalizedExplanation.includes("sending-off")) correctDecision = "Red card (Sending-off)";
      // Check "goal" last as it's common in descriptions
      else if (normalizedExplanation.includes("awards the goal") || normalizedExplanation.includes("award the goal") || (normalizedExplanation.includes("goal") && !normalizedExplanation.includes("disallow") && !normalizedExplanation.includes("no goal"))) correctDecision = "Award the goal";
      else if (normalizedExplanation.includes("play continues") || normalizedExplanation.includes("play on")) correctDecision = "Play continues";

      // DEBUG
      if (index === 7) {
          console.log(`[DEBUG Index 8] Decision: ${correctDecision}`);
      }

      // Generate distractors (excluding the correct one)
      const distractors = COMMON_DECISIONS
        .filter(d => d.toLowerCase() !== correctDecision.toLowerCase())
        .sort(() => 0.5 - Math.random()) // Shuffle
        .slice(0, 3);

      const answerOptions = [
        { label: correctDecision, isCorrect: true },
        ...distractors.map(d => ({ label: d, isCorrect: false }))
      ];

      // Shuffle options so correct isn't always first
      answerOptions.sort(() => 0.5 - Math.random());

      return {
        text: questionText,
        explanation: explanationText,
        lawNumbers: lawNumbers.length > 0 ? lawNumbers : [],
        answerOptions: answerOptions
      };

    } catch (e) {
      console.error(`Error parsing block ${index}:`, e);
      return null;
    }
  }).filter(Boolean);

  // Write to JSON
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(parsedQuestions, null, 2));
  console.log(`Successfully parsed ${parsedQuestions.length} questions to ${OUTPUT_FILE}`);
}

parseQuestions(INPUT_FILE);
