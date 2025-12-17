/**
 * Script to regenerate answer options for LOTG questions
 * - Skips manually edited questions (identified by detailed answer format)
 * - Parses explanations to generate proper answers
 * - Creates plausible but clearly incorrect distractors
 * 
 * Usage: node prisma/regenerate-answers.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ============= ANSWER GENERATION LOGIC =============

function normalizeText(text) {
  return text.replace(/\r\n/g, ' ').replace(/\s+/g, ' ').toLowerCase().trim();
}

function parseExplanation(explanation, questionText = '') {
  const norm = normalizeText(explanation);
  const questionNorm = normalizeText(questionText);
  
  const result = {
    restart: null,
    card: null,
    cardRecipient: null,
    goalOutcome: null, // 'awarded', 'disallowed', null
    special: null,
    isYesNo: false,
    noSanction: false,
    context: [] // track what the question is about
  };
  
  // === DETECT QUESTION CONTEXT ===
  if (questionNorm.includes('goal') || norm.includes('goal')) result.context.push('goal');
  if (questionNorm.includes('penalty') || norm.includes('penalty')) result.context.push('penalty');
  if (questionNorm.includes('offside')) result.context.push('offside');
  if (questionNorm.includes('handball') || norm.includes('handball')) result.context.push('handball');
  if (questionNorm.includes('foul') || norm.includes('foul')) result.context.push('foul');
  if (questionNorm.includes('card') || norm.includes('card')) result.context.push('card');
  if (questionNorm.includes('throw-in') || norm.includes('throw-in')) result.context.push('throw-in');
  if (questionNorm.includes('corner') || norm.includes('corner')) result.context.push('corner');
  if (questionNorm.includes('goalkeeper') || norm.includes('goalkeeper')) result.context.push('goalkeeper');
  
  // === YES/NO PATTERN ===
  const isYesNoQuestion = 
    questionNorm.startsWith('is ') || questionNorm.startsWith('are ') || 
    questionNorm.startsWith('can ') || questionNorm.startsWith('may ') || 
    questionNorm.startsWith('does ') || questionNorm.startsWith('do ') ||
    questionNorm.startsWith('will ') || questionNorm.startsWith('should ') ||
    questionNorm.includes('is this allowed') || questionNorm.includes('is it allowed') ||
    questionNorm.includes('is the') && questionNorm.includes('allowed');
    
  if (norm.startsWith('yes') || norm.startsWith('yes,') || norm.startsWith('yes.')) {
    result.isYesNo = true;
    result.special = 'Yes';
  } else if (norm.startsWith('no,') || norm.startsWith('no.') || norm.match(/^no[^a-z]/)) {
    result.isYesNo = true;
    result.special = 'No';
  } else if (isYesNoQuestion && !norm.includes('awards') && !norm.includes('shown a') && !norm.includes('is cautioned')) {
    if (norm.includes('not allowed') || norm.includes('may not') || norm.includes('cannot') || norm.includes('is not permitted')) {
      result.isYesNo = true;
      result.special = 'No';
    } else if (norm.includes('is allowed') || norm.includes('is permitted')) {
      result.isYesNo = true;
      result.special = 'Yes';
    }
  }
  
  // === GOAL OUTCOME (check first - important!) ===
  // First check if goal is explicitly NOT awarded / disallowed
  if (norm.includes('disallows the goal') || norm.includes('goal is disallowed') || 
      norm.includes('goal is not awarded') || norm.includes('no goal') ||
      norm.includes('goal cannot be scored') || norm.includes('cannot score') ||
      norm.includes('goal must not be awarded') || norm.includes('for the goal to be awarded')) {
    result.goalOutcome = 'disallowed';
  }
  // Then check if goal IS awarded
  else if (norm.includes('goal is awarded') || norm.includes('the goal stands') || 
           norm.includes('awards the goal') || norm.includes('the goal is valid') ||
           (norm.includes('goal') && norm.includes('awarded') && !norm.includes('not awarded'))) {
    result.goalOutcome = 'awarded';
  }
  // Check for "scores" in context where play continues (goal likely awarded)
  // But only if explanation doesn't mention a restart
  else if (questionNorm.includes('scores') && norm.includes('play continues') && 
           !norm.includes('awards') && !norm.includes('free kick') && !norm.includes('corner') && !norm.includes('offside')) {
    result.goalOutcome = 'awarded';
  }
  
  // === RESTART TYPE ===
  // Be more specific with patterns
  if (norm.includes('awards an indirect free kick') || norm.includes('award an indirect free kick') || 
      norm.includes('an indirect free kick') && norm.includes('awarded') ||
      norm.includes('restart') && norm.includes('indirect')) {
    result.restart = 'Indirect free kick';
  } else if (norm.includes('awards a penalty kick') || norm.includes('award a penalty kick') || 
             norm.includes('awards a penalty') || norm.includes('the referee awards a penalty')) {
    result.restart = 'Penalty kick';
  } else if (norm.includes('awards a direct free kick') || norm.includes('award a direct free kick') ||
             norm.includes('a direct free kick') && norm.includes('awarded')) {
    result.restart = 'Direct free kick';
  } else if (norm.includes('awards a corner kick') || norm.includes('award a corner kick') || 
             norm.includes('restarted with a corner') || norm.includes('corner kick to')) {
    result.restart = 'Corner kick';
  } else if (norm.includes('awards a goal kick') || norm.includes('restarted with a goal kick') ||
             norm.includes('goal kick to')) {
    result.restart = 'Goal kick';
  } else if (norm.includes('dropped ball for') || norm.includes('restarted with a dropped ball') ||
             norm.includes('play is stopped and') && norm.includes('dropped ball')) {
    result.restart = 'Dropped ball';
  } else if (norm.includes('throw-in is retaken') || norm.includes('opposing team will take the throw-in') ||
             norm.includes('throw-in for the opposing') || norm.includes('retaken by the same team')) {
    result.restart = 'Throw-in retaken';
  } else if (norm.includes('penalty kick is retaken') || norm.includes('penalty is retaken') || 
             norm.includes('retaken') && norm.includes('penalty')) {
    result.restart = 'Penalty kick retaken';
  } else if (norm.includes('free kick is retaken') || norm.includes('retakes the free kick') || 
             norm.includes('retakes the kick') || (norm.includes('retaken') && norm.includes('free kick'))) {
    result.restart = 'Free kick retaken';
  }
  
  // === DISCIPLINARY ACTION ===
  const cardIsConditional = norm.includes('unless') || norm.includes('in which case') || 
                            (norm.includes('if') && norm.includes('card'));
  
  if (!cardIsConditional || norm.includes('is shown a red') || norm.includes('is cautioned') || norm.includes('player is shown')) {
    // Red card detection
    if (norm.includes('shown a red card') || norm.includes('is sent off') || norm.includes('sends off') ||
        norm.includes('red card for') || norm.includes('player is sent off')) {
      result.card = 'Red card';
      if (norm.includes('violent conduct')) result.cardRecipient = 'violent conduct';
      else if (norm.includes('serious foul play')) result.cardRecipient = 'serious foul play';
      else if (norm.includes('dogso') || norm.includes('obvious goal-scoring opportunity') || norm.includes('denies an obvious')) result.cardRecipient = 'DOGSO';
      else if (norm.includes('offensive') || norm.includes('insulting') || norm.includes('abusive')) result.cardRecipient = 'offensive language';
      else if (norm.includes('second yellow') || norm.includes('second caution')) result.cardRecipient = 'second caution';
    } 
    // Yellow card detection
    else if ((norm.includes('is cautioned') || norm.includes('shown a yellow') || norm.includes('yellow card')) && 
             !norm.includes('not cautioned') && !norm.includes('no yellow')) {
      result.card = 'Yellow card';
      if (norm.includes('both players')) result.cardRecipient = 'both players';
      else if (norm.includes('unsporting behaviour') || norm.includes('unsporting behavior') || norm.includes('usb')) result.cardRecipient = 'USB';
      else if (norm.includes('delaying the restart') || norm.includes('delaying play') || norm.includes('delay')) result.cardRecipient = 'delaying restart';
      else if (norm.includes('dissent')) result.cardRecipient = 'dissent';
      else if (norm.includes('reckless')) result.cardRecipient = 'reckless foul';
      else if (norm.includes('entering') || norm.includes('leaving')) result.cardRecipient = 'entering/leaving without permission';
    }
    // Warning only
    else if ((norm.includes('warned') || norm.includes('warning')) && !norm.includes('card') && !norm.includes('caution')) {
      result.card = 'Warning only';
    }
  }
  
  // === NO SANCTION / NO OFFENCE ===
  if (norm.includes('no disciplinary sanction') || norm.includes('no sanction') || 
      norm.includes('not cautioned') || norm.includes('no offence') || 
      norm.includes('did not commit') || norm.includes('no foul') ||
      norm.includes('not an offence') || norm.includes('there is no infringement')) {
    result.noSanction = true;
  }
  
  // === SPECIAL OUTCOMES (if not already set) ===
  if (!result.goalOutcome && !result.restart) {
    if (norm.includes('allows play to continue') || norm.includes('play continues') || 
        norm.includes('the referee allows play')) {
      result.special = 'Play continues';
    }
  }
  
  return result;
}

function generateCorrectAnswer(parsed, explanation, questionText) {
  const norm = normalizeText(explanation);
  const questionNorm = normalizeText(questionText);
  
  // Yes/No questions
  if (parsed.isYesNo) {
    return parsed.special;
  }
  
  // === GOAL-RELATED OUTCOMES (highest priority) ===
  if (parsed.goalOutcome === 'awarded') {
    if (parsed.card) {
      return `Goal awarded + ${parsed.card}${parsed.cardRecipient ? ' (' + parsed.cardRecipient + ')' : ''}`;
    }
    return 'Goal awarded';
  }
  
  if (parsed.goalOutcome === 'disallowed') {
    if (parsed.restart && parsed.card) {
      return `Goal disallowed – ${parsed.restart} + ${parsed.card}${parsed.cardRecipient ? ' (' + parsed.cardRecipient + ')' : ''}`;
    }
    if (parsed.restart) {
      return `Goal disallowed – ${parsed.restart}`;
    }
    return 'Goal disallowed';
  }
  
  // === RESTART + CARD COMBINATIONS ===
  const parts = [];
  
  if (parsed.restart) {
    parts.push(parsed.restart);
  }
  
  if (parsed.card && parsed.card !== 'Warning only') {
    if (parsed.cardRecipient === 'both players') {
      parts.push('Yellow card for both players');
    } else if (parsed.cardRecipient) {
      parts.push(`${parsed.card} (${parsed.cardRecipient})`);
    } else {
      parts.push(parsed.card);
    }
  } else if (parsed.card === 'Warning only') {
    if (parsed.restart) {
      parts.push('Warning only');
    } else {
      return 'Warning only';
    }
  }
  
  if (parts.length > 0) {
    return parts.join(' + ');
  }
  
  // === SPECIAL OUTCOMES ===
  if (parsed.special) {
    return parsed.special;
  }
  
  // === FALLBACK PATTERNS ===
  if (norm.includes('no offence') || norm.includes('no foul') || norm.includes('not an offence')) {
    return 'No offence – play continues';
  }
  if (norm.includes('dissent') && norm.includes('caution')) {
    return 'Yellow card (dissent)';
  }
  if (norm.includes('retaken') && !parsed.restart) {
    return 'Restart retaken';
  }
  
  return 'Play continues';
}

function generateDistractors(parsed, correctAnswer, explanation, questionText) {
  const norm = normalizeText(explanation);
  const correctLower = correctAnswer.toLowerCase();
  
  // Context-aware distractor pools
  const distractors = [];
  
  // If correct answer involves a goal outcome
  if (parsed.goalOutcome === 'awarded') {
    distractors.push(
      'Goal disallowed – indirect free kick',
      'Goal disallowed – offside',
      'Goal disallowed – dropped ball',
      'Penalty kick retaken',
      'Corner kick'
    );
  } else if (parsed.goalOutcome === 'disallowed') {
    distractors.push(
      'Goal awarded',
      'Goal awarded + Yellow card',
      'Play continues – goal stands',
      'Penalty kick',
      'Corner kick'
    );
  }
  
  // If correct answer is a restart type
  if (parsed.restart) {
    // Add opposite/different restarts
    const otherRestarts = [
      'Direct free kick', 'Indirect free kick', 'Penalty kick', 
      'Corner kick', 'Goal kick', 'Dropped ball', 'Throw-in retaken'
    ].filter(r => !correctLower.includes(r.toLowerCase()));
    distractors.push(...otherRestarts.slice(0, 3));
    
    // Add wrong card combinations
    if (parsed.card) {
      distractors.push(`${parsed.restart} – no card required`);
      if (parsed.card === 'Yellow card') {
        distractors.push(`${parsed.restart} + Red card`);
      } else if (parsed.card === 'Red card') {
        distractors.push(`${parsed.restart} + Yellow card`);
      }
    } else {
      distractors.push(`${parsed.restart} + Yellow card`);
      distractors.push(`${parsed.restart} + Red card (DOGSO)`);
    }
  }
  
  // If correct answer involves a card
  if (parsed.card && !parsed.restart) {
    if (parsed.card === 'Yellow card') {
      distractors.push('Red card (violent conduct)', 'Red card (DOGSO)', 'No disciplinary action', 'Warning only');
    } else if (parsed.card === 'Red card') {
      distractors.push('Yellow card (USB)', 'Yellow card (reckless foul)', 'No disciplinary action', 'Warning only');
    }
  }
  
  // If correct answer is Yes/No
  if (parsed.isYesNo) {
    if (correctAnswer === 'Yes') {
      distractors.push('No', 'No – not permitted', 'Only with referee permission', 'Only before the match starts');
    } else {
      distractors.push('Yes', 'Yes – with referee permission', 'Yes – but only once', 'At referee\'s discretion');
    }
  }
  
  // If correct answer is play continues
  if (correctLower.includes('play continues') || correctLower.includes('no offence')) {
    distractors.push(
      'Indirect free kick',
      'Direct free kick', 
      'Yellow card (USB)',
      'Penalty kick',
      'Dropped ball'
    );
  }
  
  // General fallback distractors
  const fallbackPool = [
    'Direct free kick + Yellow card',
    'Indirect free kick',
    'Penalty kick',
    'Corner kick', 
    'Goal kick',
    'Dropped ball',
    'Play continues',
    'Yellow card (USB)',
    'Red card (violent conduct)',
    'Free kick retaken',
    'No action required'
  ];
  
  distractors.push(...fallbackPool);
  
  // Filter and select
  const filtered = distractors.filter(d => {
    const dLower = d.toLowerCase();
    if (dLower === correctLower) return false;
    if (correctLower.includes(dLower) && dLower.length > 8) return false;
    if (dLower.includes(correctLower) && correctLower.length > 8) return false;
    return true;
  });
  
  // Remove duplicates and shuffle
  const unique = [...new Set(filtered)];
  const shuffled = unique.sort(() => Math.random() - 0.5);
  
  return shuffled.slice(0, 3);
}

function isManuallyEdited(answerOptions) {
  const labels = answerOptions.map(a => a.label.toLowerCase().trim());
  
  const genericLabels = [
    'direct free kick', 'indirect free kick', 'penalty kick', 'award the goal',
    'corner kick', 'goal kick', 'dropped ball', 'play continues',
    'retake the restart', 'yellow card (caution)', 'red card (sending-off)',
    'see explanation for correct ruling', 'goal awarded', 'yes', 'no'
  ];
  
  const hasDetailedAnswer = labels.some(label => {
    if (genericLabels.includes(label)) return false;
    if (label.includes(' + ') && label.includes('for ')) return true;
    if (label.includes('team a') || label.includes('team b') || label.includes('gk')) return true;
    if (label.includes('from position') || label.includes('from where')) return true;
    if (label.length > 50 && !genericLabels.some(g => label.startsWith(g))) return true;
    return false;
  });
  
  return hasDetailedAnswer;
}

// ============= MAIN EXECUTION =============

async function regenerateAnswers() {
  console.log('🚀 Starting improved answer regeneration...\n');
  
  const questions = await prisma.question.findMany({
    where: { type: 'LOTG_TEXT' },
    include: { answerOptions: true },
    orderBy: { createdAt: 'asc' }
  });
  
  console.log(`Found ${questions.length} total questions.\n`);
  
  let skippedCount = 0;
  let updatedCount = 0;
  let errorCount = 0;
  
  for (const q of questions) {
    if (isManuallyEdited(q.answerOptions)) {
      skippedCount++;
      continue;
    }
    
    try {
      const parsed = parseExplanation(q.explanation, q.text);
      const correctAnswer = generateCorrectAnswer(parsed, q.explanation, q.text);
      const distractors = generateDistractors(parsed, correctAnswer, q.explanation, q.text);
      
      const newAnswers = [
        { label: correctAnswer, isCorrect: true },
        ...distractors.map(d => ({ label: d, isCorrect: false }))
      ];
      
      // Shuffle
      newAnswers.sort(() => Math.random() - 0.5);
      
      await prisma.$transaction(async (tx) => {
        await tx.answerOption.deleteMany({ where: { questionId: q.id } });
        await tx.question.update({
          where: { id: q.id },
          data: {
            answerOptions: {
              create: newAnswers.map((opt, idx) => ({
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
      if (updatedCount % 50 === 0) {
        console.log(`Progress: ${updatedCount} updated...`);
      }
    } catch (err) {
      console.error(`Error updating question ${q.id}:`, err.message);
      errorCount++;
    }
  }
  
  console.log('\n✅ Answer regeneration complete!');
  console.log(`Updated: ${updatedCount}`);
  console.log(`Skipped (manually edited): ${skippedCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Total: ${questions.length}`);
}

regenerateAnswers()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
