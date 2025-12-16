/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * IFAB Laws of the Game FAQ Import Script
 * 
 * This script imports official FAQ questions from the IFAB website
 * Each question has 4 answer options with one correct answer marked.
 */

const { PrismaClient, CategoryType, QuestionType } = require("@prisma/client");

const prisma = new PrismaClient();

// IFAB FAQ Questions organized by Law Number
const ifabFAQs = [
  // ============================================
  // LAW 1 - THE FIELD OF PLAY
  // ============================================
  {
    lawNumbers: [ 1,
    text: "The crossbar becomes broken during the match. What is the correct decision?",
    explanation: "If the crossbar becomes displaced or broken, play is stopped until it has been repaired or replaced. If repair or replacement is not possible, the match must be abandoned. The use of a rope or any flexible or dangerous material to replace the crossbar is not permitted.",
    answers: [
      { label: "Stop play and wait for repair; if not possible, abandon the match", isCorrect: true },
      { label: "Continue play as long as both teams agree", isCorrect: false },
      { label: "Use a temporary rope as replacement and continue", isCorrect: false },
      { label: "Award the match to the team that was winning", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 1,
    text: "The referee enters the field of play for the pre-match inspection and sees that one corner flag is missing or the goalposts/crossbar are grey (not white). What should the referee do?",
    explanation: "The referee must ensure all mandatory field markings and equipment are correct before the match. Corner flags are mandatory and must be present. Goalposts and crossbar must be white. The referee should not start the match until these issues are corrected.",
    answers: [
      { label: "Do not start the match until the corner flag is in place and goalposts are white", isCorrect: true },
      { label: "Start the match but note it in the match report", isCorrect: false },
      { label: "Allow play if both captains agree", isCorrect: false },
      { label: "Abandon the match immediately", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 1,
    text: "A substitute enters the video operation room (VOR) during a match. The referee is informed about this incident when play next stops. What is the correct procedure?",
    explanation: "A substitute entering the VOR is misconduct. The substitute must be cautioned for entering a restricted area and must leave the VOR immediately.",
    answers: [
      { label: "Caution the substitute for entering the VOR", isCorrect: true },
      { label: "Send off the substitute with a red card", isCorrect: false },
      { label: "Warn the substitute verbally with no card", isCorrect: false },
      { label: "Report to the match commissioner only", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 1,
    text: "A coach enters the referee review area when the referee undertakes an on-field review. What is the correct procedure?",
    explanation: "Only the referee is permitted in the referee review area (RRA) during an on-field review. Any person who enters the RRA must be cautioned.",
    answers: [
      { label: "Caution the coach for entering the referee review area", isCorrect: true },
      { label: "Send off the coach with a red card", isCorrect: false },
      { label: "Issue a verbal warning only", isCorrect: false },
      { label: "Allow it as coaches can advise the referee", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 1,
    text: "The referee initiates an on-field review for a serious missed incident in the penalty area. A player enters the referee review area when the referee is watching the replay footage. What is the correct procedure?",
    explanation: "Only the referee is permitted in the RRA during an on-field review. Any player who enters the RRA must be cautioned for unsporting behaviour.",
    answers: [
      { label: "Caution the player for entering the referee review area", isCorrect: true },
      { label: "Send off the player with a red card", isCorrect: false },
      { label: "Issue a verbal warning and continue", isCorrect: false },
      { label: "Ignore the incident as play is stopped", isCorrect: false },
    ],
  },

  // ============================================
  // LAW 2 - THE BALL
  // ============================================
  {
    lawNumbers: [ 2,
    text: "During a match, the ball bursts when it is kicked by a player and goes into the goal. What is the correct decision?",
    explanation: "If the ball becomes defective at the moment it is kicked and subsequently enters the goal, the goal is not awarded. Play is restarted with a dropped ball.",
    answers: [
      { label: "Dropped ball at the location where the ball became defective", isCorrect: true },
      { label: "Award the goal as the ball crossed the line", isCorrect: false },
      { label: "Retake the kick with a new ball", isCorrect: false },
      { label: "Indirect free kick to the defending team", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 2,
    text: "The ball hits the referee and goes directly into the goal. What is the correct decision?",
    explanation: "If the ball becomes in play and touches the referee (or other match official), play continues unless the ball goes into the goal, team possession changes or a promising attack starts. If the ball goes into the goal after touching the referee, the goal is not awarded and play restarts with a dropped ball.",
    answers: [
      { label: "Dropped ball; no goal is awarded", isCorrect: true },
      { label: "Award the goal", isCorrect: false },
      { label: "Indirect free kick to the defending team", isCorrect: false },
      { label: "Corner kick to the attacking team", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 2,
    text: "During the match, an extra ball is on the field and interferes with play. What should the referee do?",
    explanation: "If an extra ball, other object or animal enters the field of play during the match, the referee must stop play only if it interferes with play. Play is restarted with a dropped ball.",
    answers: [
      { label: "Stop play and restart with a dropped ball", isCorrect: true },
      { label: "Continue play and remove the ball at the next stoppage", isCorrect: false },
      { label: "Award an indirect free kick to the team in possession", isCorrect: false },
      { label: "Abandon the match due to interference", isCorrect: false },
    ],
  },

  // ============================================
  // LAW 3 - THE PLAYERS
  // ============================================
  {
    lawNumbers: [ 3,
    text: "A substitute enters the field during play without permission and interferes with play. What is the correct decision?",
    explanation: "If a substitute enters the field without the referee's permission, the referee stops play (not immediately if the substitute does not interfere with play). The substitute is cautioned and play restarts with an indirect free kick from where the ball was when play was stopped.",
    answers: [
      { label: "Caution the substitute; indirect free kick from where the ball was", isCorrect: true },
      { label: "Send off the substitute; direct free kick", isCorrect: false },
      { label: "Verbal warning; drop ball", isCorrect: false },
      { label: "Allow play to continue if no advantage gained", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 3,
    text: "A team official enters the field of play and interferes with play. What is the correct decision?",
    explanation: "If a team official enters the field of play, the referee must stop play (not immediately if the team official does not interfere with play) and have the team official removed. The appropriate disciplinary action is taken. If interfering with play, the restart is a direct free kick or penalty kick.",
    answers: [
      { label: "Stop play; remove the official; direct free kick or penalty kick if interference", isCorrect: true },
      { label: "Indirect free kick only", isCorrect: false },
      { label: "Dropped ball after removing the official", isCorrect: false },
      { label: "Continue play and deal with it at the next stoppage", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 3,
    text: "A player who has left the field to correct equipment re-enters without the referee's permission and scores a goal. What happens?",
    explanation: "A player who re-enters without permission must be cautioned. If the player interfered with play (scoring a goal is interference), the goal is disallowed and play restarts with an indirect free kick.",
    answers: [
      { label: "Disallow the goal; caution the player; indirect free kick", isCorrect: true },
      { label: "Allow the goal and caution the player afterward", isCorrect: false },
      { label: "Disallow the goal; no card needed", isCorrect: false },
      { label: "Allow the goal if equipment is now correct", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 3,
    text: "During kicks from the penalty mark, a player is injured and cannot continue. The team has already used all substitutions. What happens?",
    explanation: "During kicks from the penalty mark, if a kicker is injured and cannot continue, they may be replaced by a player excluded from the kicks. However, if no substitutes are available and no excluded players can take their place, the team continues with fewer kickers.",
    answers: [
      { label: "The team continues with one fewer kicker if no replacement available", isCorrect: true },
      { label: "The match is abandoned", isCorrect: false },
      { label: "The injured player must still take a kick", isCorrect: false },
      { label: "The other team must also reduce their kickers by one", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 3,
    text: "A team starts a match with 10 players. The 11th player arrives after the match has started. Can they join the match?",
    explanation: "A player whose name is on the team list may enter the field of play to join the match at any time but only during a stoppage in play and after being checked by the referee.",
    answers: [
      { label: "Yes, they can enter during a stoppage after being checked by the referee", isCorrect: true },
      { label: "No, they cannot join once the match has started", isCorrect: false },
      { label: "Only at half-time", isCorrect: false },
      { label: "Only with permission from the opposing captain", isCorrect: false },
    ],
  },

  // ============================================
  // LAW 4 - THE PLAYERS' EQUIPMENT
  // ============================================
  {
    lawNumbers: [ 4,
    text: "A player is wearing jewelry that cannot be removed. What should the referee do?",
    explanation: "Players must not wear any jewelry (including rings, watches, bracelets, earrings, leather bands, rubber bands, etc.). If jewelry cannot be removed, the player must not participate.",
    answers: [
      { label: "The player must not participate until the jewelry is removed", isCorrect: true },
      { label: "Allow participation if the jewelry is taped over", isCorrect: false },
      { label: "Allow participation with written consent from both captains", isCorrect: false },
      { label: "Allow participation but note it in the match report", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 4,
    text: "A goalkeeper's jersey is the same colour as the outfield players' jerseys. What should happen?",
    explanation: "The goalkeeper must wear colours that are distinguishable from the other players and the match officials.",
    answers: [
      { label: "The goalkeeper must change to a different coloured jersey", isCorrect: true },
      { label: "The match can proceed if both teams agree", isCorrect: false },
      { label: "The outfield players must change their jerseys", isCorrect: false },
      { label: "The referee should abandon the match", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 4,
    text: "A player loses their footwear accidentally during play and immediately scores a goal. Is the goal valid?",
    explanation: "If a player accidentally loses their footwear and immediately plays the ball or scores a goal, there is no offence.",
    answers: [
      { label: "Yes, the goal is valid", isCorrect: true },
      { label: "No, the goal is disallowed", isCorrect: false },
      { label: "The goal is valid only if play continued for more than 3 seconds", isCorrect: false },
      { label: "The referee must stop play for the player to retrieve footwear", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 4,
    text: "A player is wearing undershorts that extend below the main shorts. What colour must they be?",
    explanation: "Undershorts/tights must be the same colour as the main colour of the shorts or the lowest part of the shorts.",
    answers: [
      { label: "The same colour as the main colour of the shorts or the lowest part", isCorrect: true },
      { label: "Any colour as long as all players have the same", isCorrect: false },
      { label: "Only black or white", isCorrect: false },
      { label: "The same colour as the socks", isCorrect: false },
    ],
  },

  // ============================================
  // LAW 5 - THE REFEREE
  // ============================================
  {
    lawNumbers: [ 5,
    text: "A referee realises that they made an error in allowing play to continue. Can they change their decision?",
    explanation: "The referee may change a decision on realising that it is incorrect or on the advice of another match official, provided play has not already restarted or the referee has not signalled the end of the first or second half (including extra time) and left the field of play.",
    answers: [
      { label: "Yes, if play has not restarted or the half/match has not ended", isCorrect: true },
      { label: "No, all decisions are final once made", isCorrect: false },
      { label: "Only with agreement from both captains", isCorrect: false },
      { label: "Only if VAR recommends the change", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 5,
    text: "The referee gives a yellow card to the wrong player (mistaken identity). When can this be corrected?",
    explanation: "If the referee shows a card to the wrong player because of mistaken identity, they may correct the error if they have not already restarted play or signalled the end of the half/match.",
    answers: [
      { label: "Before play restarts or the half/match ends", isCorrect: true },
      { label: "At any time during the match", isCorrect: false },
      { label: "Only at half-time", isCorrect: false },
      { label: "Only if VAR intervenes", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 5,
    text: "The VAR recommends an on-field review (OFR). Must the referee accept the recommendation?",
    explanation: "The referee is not obliged to accept the VAR's recommendation but should do so unless there is a clear reason to reject it.",
    answers: [
      { label: "No, but the referee should unless there is a clear reason to reject it", isCorrect: true },
      { label: "Yes, the referee must always accept VAR recommendations", isCorrect: false },
      { label: "No, the referee can ignore all VAR recommendations", isCorrect: false },
      { label: "Only for red card decisions", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 5,
    text: "What signal does the referee make before reviewing the VAR monitor?",
    explanation: "The referee makes the TV signal (drawing a rectangle) before going to the referee review area for an on-field review.",
    answers: [
      { label: "The TV signal - drawing a rectangle", isCorrect: true },
      { label: "A whistle followed by pointing to the monitor", isCorrect: false },
      { label: "Holding up both hands", isCorrect: false },
      { label: "No specific signal is required", isCorrect: false },
    ],
  },

  // ============================================
  // LAW 6 - THE OTHER MATCH OFFICIALS
  // ============================================
  {
    lawNumbers: [ 6,
    text: "The assistant referee signals for offside but the referee decides it is not offside. Who has the final decision?",
    explanation: "The referee has the final decision on all facts connected with play and may overrule an assistant referee's decision.",
    answers: [
      { label: "The referee has the final decision", isCorrect: true },
      { label: "The assistant referee's flag is always final", isCorrect: false },
      { label: "VAR must be consulted", isCorrect: false },
      { label: "The two officials must discuss and agree", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 6,
    text: "An assistant referee sees a serious foul play incident outside the referee's view. What should they do?",
    explanation: "The assistant referee may enter the field of play to help control situations such as violent confrontations. They should signal to the referee and report what they saw.",
    answers: [
      { label: "Signal to the referee and report the incident", isCorrect: true },
      { label: "Wait until the next stoppage to inform the referee", isCorrect: false },
      { label: "Take no action as it was outside their area", isCorrect: false },
      { label: "Show a card directly to the player", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 6,
    text: "The fourth official indicates there should be 4 minutes of added time. The referee decides to add 6 minutes. Is this allowed?",
    explanation: "The fourth official indicates the minimum additional time decided by the referee at the end of the final minute of each half. The referee may increase, but not reduce, this time.",
    answers: [
      { label: "Yes, the referee may add more time but cannot reduce it", isCorrect: true },
      { label: "No, the time shown must be exactly followed", isCorrect: false },
      { label: "The referee can reduce or increase the time", isCorrect: false },
      { label: "Only VAR can modify added time", isCorrect: false },
    ],
  },

  // ============================================
  // LAW 7 - THE DURATION OF THE MATCH
  // ============================================
  {
    lawNumbers: [ 7,
    text: "A penalty kick is to be taken at the end of the first half. Half-time has begun and players have left the field. Can the penalty still be taken?",
    explanation: "If a penalty kick has to be taken or retaken, the half is extended until the penalty kick is completed. Players may return to the field to take/defend the kick.",
    answers: [
      { label: "Yes, players return and the penalty is taken", isCorrect: true },
      { label: "No, the penalty is taken at the start of the second half", isCorrect: false },
      { label: "No, once half-time begins the penalty is cancelled", isCorrect: false },
      { label: "Yes, but only the kicker and goalkeeper are needed", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 7,
    text: "A goal is scored in added time. Should the referee add more time?",
    explanation: "The referee allows for all time lost during the half, including time for goal celebrations. Time lost for celebrating a goal should be added.",
    answers: [
      { label: "Yes, time lost for goal celebrations should be added", isCorrect: true },
      { label: "No, the time shown on the board is the maximum", isCorrect: false },
      { label: "Only if there were excessive celebrations", isCorrect: false },
      { label: "The goal ends the half immediately", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 7,
    text: "Heavy rain makes the field unplayable during a match. What should the referee do?",
    explanation: "If weather conditions worsen to the extent that the field becomes unplayable, the referee may suspend the match temporarily. If conditions do not improve sufficiently, the match is abandoned.",
    answers: [
      { label: "Suspend play; abandon if conditions don't improve", isCorrect: true },
      { label: "Continue play regardless of conditions", isCorrect: false },
      { label: "Immediately abandon the match", isCorrect: false },
      { label: "Award the match to the team that was winning", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 7,
    text: "The first half ends without the referee blowing the whistle for half-time. What happens?",
    explanation: "The half ends only when the referee signals the end by blowing the whistle. If the referee forgets, play should continue.",
    answers: [
      { label: "Play continues until the referee signals for half-time", isCorrect: true },
      { label: "The half automatically ends after 45 minutes", isCorrect: false },
      { label: "The fourth official should end the half", isCorrect: false },
      { label: "Either captain can signal for half-time", isCorrect: false },
    ],
  },

  // ============================================
  // LAW 8 - THE START AND RESTART OF PLAY
  // ============================================
  {
    lawNumbers: [ 8,
    text: "A goal is scored directly from the kick-off without the ball touching any other player. Is the goal valid?",
    explanation: "A goal may be scored directly from the kick-off against the opponents. A goal cannot be scored against the team taking the kick-off.",
    answers: [
      { label: "Yes, a goal can be scored directly against the opponents", isCorrect: true },
      { label: "No, another player must touch the ball first", isCorrect: false },
      { label: "Only if it was intentional", isCorrect: false },
      { label: "The goal is valid only in the second half", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 8,
    text: "After a dropped ball, the ball goes directly into the goal without touching any player. What is the decision?",
    explanation: "If a dropped ball enters the goal without touching at least two players, play is restarted with a goal kick or corner kick depending on which goal.",
    answers: [
      { label: "Goal kick if it enters the opponents' goal; corner kick if own goal", isCorrect: true },
      { label: "The goal is awarded", isCorrect: false },
      { label: "Drop ball is retaken", isCorrect: false },
      { label: "Indirect free kick to the defending team", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 8,
    text: "The referee stops play because the ball has hit them and changed possession. How is play restarted?",
    explanation: "When play is stopped because the ball touched a match official and changed possession, it is restarted with a dropped ball for the team that last touched the ball.",
    answers: [
      { label: "Dropped ball for the team that last touched the ball", isCorrect: true },
      { label: "Dropped ball contested by both teams", isCorrect: false },
      { label: "Throw-in to the team that did not last touch the ball", isCorrect: false },
      { label: "Play continues; no stoppage needed", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 8,
    text: "For a dropped ball, where is the ball dropped if play was stopped in the penalty area?",
    explanation: "If play was stopped in the penalty area, the ball is dropped for the goalkeeper of the team that was in possession in the penalty area.",
    answers: [
      { label: "The ball is dropped for the goalkeeper inside the penalty area", isCorrect: true },
      { label: "The ball is dropped on the penalty area line", isCorrect: false },
      { label: "The ball is dropped at the penalty spot", isCorrect: false },
      { label: "The ball is dropped outside the penalty area", isCorrect: false },
    ],
  },

  // ============================================
  // LAW 9 - THE BALL IN AND OUT OF PLAY
  // ============================================
  {
    lawNumbers: [ 9,
    text: "The ball hits the corner flag and bounces back into play. Is the ball still in play?",
    explanation: "The ball is in play if it rebounds from a goalpost, crossbar, corner flagpost and remains on the field of play.",
    answers: [
      { label: "Yes, the ball is still in play", isCorrect: true },
      { label: "No, corner kick is awarded", isCorrect: false },
      { label: "No, throw-in is awarded", isCorrect: false },
      { label: "Dropped ball is awarded", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 9,
    text: "The ball hits the referee and goes out of play over the touchline. What is the restart?",
    explanation: "If the ball goes out of play after touching a match official, play restarts according to where it left the field - in this case, a throw-in.",
    answers: [
      { label: "Throw-in to the team that did not last play the ball before it hit the referee", isCorrect: true },
      { label: "Dropped ball", isCorrect: false },
      { label: "Throw-in to the team that last played the ball", isCorrect: false },
      { label: "Indirect free kick", isCorrect: false },
    ],
  },

  // ============================================
  // LAW 10 - DETERMINING THE OUTCOME
  // ============================================
  {
    lawNumbers: [ 10,
    text: "The ball crosses the goal line between the posts, but the referee does not see it and awards a corner kick. VAR reviews and confirms it was a goal. What happens?",
    explanation: "VAR can only be used for clear and obvious errors or serious missed incidents relating to goals. If VAR confirms the ball crossed the line, the goal should be awarded.",
    answers: [
      { label: "The goal is awarded after VAR confirmation", isCorrect: true },
      { label: "Corner kick stands as the referee's original decision", isCorrect: false },
      { label: "Dropped ball at the goal area", isCorrect: false },
      { label: "Penalty kick to the attacking team", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 10,
    text: "During kicks from the penalty mark, the goalkeeper saves a kick but moves off the goal line before the ball is kicked. What is the decision?",
    explanation: "If the goalkeeper commits an offence and the kick is saved, the kick is retaken and the goalkeeper is cautioned (unless the kick needed to be retaken for another reason).",
    answers: [
      { label: "Retake the kick and caution the goalkeeper", isCorrect: true },
      { label: "The save stands as the ball was saved", isCorrect: false },
      { label: "The kick is scored automatically", isCorrect: false },
      { label: "The team loses their kick", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 10,
    text: "During kicks from the penalty mark, both teams have taken 5 kicks and the score is level. What happens next?",
    explanation: "If after 5 kicks the scores are level, kicks continue until one team has scored a goal more than the other from the same number of kicks.",
    answers: [
      { label: "Kicks continue in sudden death (one kick each until one team is ahead)", isCorrect: true },
      { label: "Another full round of 5 kicks each", isCorrect: false },
      { label: "The match is declared a draw", isCorrect: false },
      { label: "Coin toss decides the winner", isCorrect: false },
    ],
  },

  // ============================================
  // LAW 11 - OFFSIDE
  // ============================================
  {
    lawNumbers: [ 11,
    text: "An attacker in an offside position receives the ball directly from a goal kick. Is this offside?",
    explanation: "There is no offside offence if a player receives the ball directly from a goal kick.",
    answers: [
      { label: "No, there is no offside from a goal kick", isCorrect: true },
      { label: "Yes, offside applies to all restarts", isCorrect: false },
      { label: "Only if the player was in the penalty area", isCorrect: false },
      { label: "Only if the player scored directly", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 11,
    text: "An attacker in an offside position is behind the ball when it is played by a teammate. Is this offside?",
    explanation: "A player is in an offside position if any part of the head, body or feet is nearer to the opponents' goal line than both the ball and the second-last opponent. If behind the ball, they cannot be offside.",
    answers: [
      { label: "No, a player behind the ball cannot be in an offside position", isCorrect: true },
      { label: "Yes, if they are in the attacking half", isCorrect: false },
      { label: "Yes, if they become involved in play", isCorrect: false },
      { label: "Only if closer to goal than the goalkeeper", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 11,
    text: "A defender deliberately plays the ball but it goes to an attacker who was in an offside position. Is this offside?",
    explanation: "A player in an offside position receiving the ball from an opponent who deliberately plays the ball is not offside, unless it was a deliberate save.",
    answers: [
      { label: "No, it is not offside if the defender deliberately played the ball (unless a save)", isCorrect: true },
      { label: "Yes, it is always offside if the attacker was in an offside position", isCorrect: false },
      { label: "Only if the defender was outside the penalty area", isCorrect: false },
      { label: "The assistant referee decides based on intent", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 11,
    text: "An attacker in an offside position clearly obstructs the goalkeeper's line of vision. What is the decision?",
    explanation: "A player in an offside position commits an offside offence if they interfere with an opponent by preventing an opponent from playing or being able to play the ball by clearly obstructing the opponent's line of vision.",
    answers: [
      { label: "Offside - interfering with an opponent by obstructing line of vision", isCorrect: true },
      { label: "Not offside unless the player touches the ball", isCorrect: false },
      { label: "Indirect free kick for obstruction, not offside", isCorrect: false },
      { label: "Play on unless the goalkeeper complains", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 11,
    text: "An attacker in an offside position runs toward the ball but a teammate who was onside gets there first and plays the ball. Is there an offside offence?",
    explanation: "Moving towards or running towards the ball does not commit an offside offence if the player does not play or touch the ball and does not interfere with an opponent.",
    answers: [
      { label: "No offside if they did not touch the ball or interfere with an opponent", isCorrect: true },
      { label: "Yes, running towards the ball is always offside", isCorrect: false },
      { label: "Offside because they distracted the defence", isCorrect: false },
      { label: "Delayed offside applies and flag should be raised", isCorrect: false },
    ],
  },

  // ============================================
  // LAW 12 - FOULS AND MISCONDUCT
  // ============================================
  {
    lawNumbers: [ 12,
    text: "A defender handles the ball to prevent a goal but the ball still goes into the goal. What is the decision?",
    explanation: "If a player denies a goal or obvious goal-scoring opportunity by handling the ball but a goal is scored, the player is cautioned (not sent off) and the goal stands.",
    answers: [
      { label: "Goal is awarded; the defender is cautioned", isCorrect: true },
      { label: "Goal is awarded; the defender is sent off", isCorrect: false },
      { label: "Goal is disallowed; penalty kick awarded", isCorrect: false },
      { label: "Goal is awarded; no disciplinary action", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 12,
    text: "A player uses excessive force against an opponent during a challenge for the ball. What is the sanction?",
    explanation: "Using excessive force is when a player exceeds the necessary use of force and/or endangers the safety of an opponent. A player who uses excessive force must be sent off.",
    answers: [
      { label: "Direct free kick (or penalty) and a red card", isCorrect: true },
      { label: "Direct free kick and a yellow card", isCorrect: false },
      { label: "Indirect free kick and a red card", isCorrect: false },
      { label: "Verbal warning only", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 12,
    text: "A goalkeeper inside their penalty area handles a deliberate back-pass from a teammate. What is the decision?",
    explanation: "If a goalkeeper handles the ball from a deliberate kick by a teammate, it is an indirect free kick offence. No card is given unless it prevents a goal or denies an obvious goal-scoring opportunity.",
    answers: [
      { label: "Indirect free kick from where the goalkeeper handled the ball", isCorrect: true },
      { label: "Direct free kick", isCorrect: false },
      { label: "Penalty kick", isCorrect: false },
      { label: "Dropped ball", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 12,
    text: "A player commits a reckless challenge. What is the correct sanction?",
    explanation: "Reckless is when a player acts with disregard to the danger to, or consequences for, an opponent. A player who acts recklessly must be cautioned.",
    answers: [
      { label: "Direct free kick and a yellow card", isCorrect: true },
      { label: "Direct free kick only, no card", isCorrect: false },
      { label: "Indirect free kick and a yellow card", isCorrect: false },
      { label: "Direct free kick and a red card", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 12,
    text: "A player denies an obvious goal-scoring opportunity by fouling an opponent in the penalty area, but was genuinely attempting to play the ball. What is the decision?",
    explanation: "If a player commits a foul that denies an obvious goal-scoring opportunity in the penalty area but was making a genuine attempt to play the ball, the player is cautioned (not sent off), and a penalty kick is awarded.",
    answers: [
      { label: "Penalty kick and yellow card (genuine attempt to play the ball)", isCorrect: true },
      { label: "Penalty kick and red card", isCorrect: false },
      { label: "Direct free kick outside the area and red card", isCorrect: false },
      { label: "Penalty kick only, no card", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 12,
    text: "A player spits at an opponent but misses. What is the sanction?",
    explanation: "Spitting at a person is violent conduct and results in a sending off, even if the spit does not make contact.",
    answers: [
      { label: "Red card for violent conduct", isCorrect: true },
      { label: "Yellow card for unsporting behaviour", isCorrect: false },
      { label: "No sanction as the spit missed", isCorrect: false },
      { label: "Verbal warning only", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 12,
    text: "A player commits an offence against an opponent off the field of play during play. What is the restart?",
    explanation: "If a player commits an offence against an opponent off the field while the ball is in play, play is restarted with a direct free kick on the boundary line nearest to where the offence occurred.",
    answers: [
      { label: "Direct free kick on the boundary line nearest to the offence", isCorrect: true },
      { label: "Dropped ball", isCorrect: false },
      { label: "Indirect free kick where the ball was", isCorrect: false },
      { label: "No restart, play continues", isCorrect: false },
    ],
  },

  // ============================================
  // LAW 13 - FREE KICKS
  // ============================================
  {
    lawNumbers: [ 13,
    text: "A free kick is taken quickly and goes directly into the opponent's goal without touching another player. Is the goal valid?",
    explanation: "A goal may be scored directly from a direct free kick. If it is an indirect free kick, the goal is not awarded.",
    answers: [
      { label: "Yes if direct; no if indirect (goal kick awarded instead)", isCorrect: true },
      { label: "Yes, all goals from free kicks are valid", isCorrect: false },
      { label: "No, another player must touch the ball first", isCorrect: false },
      { label: "Only if the goalkeeper was beaten", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 13,
    text: "A defending team forms a wall of 4 players at a free kick in a dangerous position. An attacking player stands within 1 metre of the wall. What should the referee do?",
    explanation: "If there is a 'wall' of three or more defending players, all attacking players must remain at least 1m from the wall until the ball is in play. An indirect free kick is awarded if this is not respected.",
    answers: [
      { label: "Indirect free kick to the defending team if the kick is taken", isCorrect: true },
      { label: "Allow play to continue as it benefits the attack", isCorrect: false },
      { label: "Caution the attacking player", isCorrect: false },
      { label: "Order the free kick to be retaken", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 13,
    text: "A player takes a free kick but the ball hits the referee and goes into the goal. What is the decision?",
    explanation: "If a free kick is taken and the ball hits a match official and goes into the goal, the goal is not awarded. Play restarts with a dropped ball.",
    answers: [
      { label: "Dropped ball; no goal is awarded", isCorrect: true },
      { label: "Goal is awarded", isCorrect: false },
      { label: "Free kick is retaken", isCorrect: false },
      { label: "Indirect free kick to defending team", isCorrect: false },
    ],
  },

  // ============================================
  // LAW 14 - THE PENALTY KICK
  // ============================================
  {
    lawNumbers: [ 14,
    text: "The penalty kicker kicks the ball backwards to a teammate at a penalty kick. What is the decision?",
    explanation: "The ball must be kicked forward. If the ball is kicked backwards, the kick is retaken. The kicker may be cautioned for unsporting behaviour if it is considered to be an attempt to circumvent the Law.",
    answers: [
      { label: "The penalty kick is retaken; the kicker may be cautioned", isCorrect: true },
      { label: "Indirect free kick to the defending team", isCorrect: false },
      { label: "Play continues from where the teammate received it", isCorrect: false },
      { label: "Goal kick to the defending team", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 14,
    text: "At a penalty kick, the goalkeeper and a teammate of the kicker both commit an offence before the ball is in play. The ball goes into the goal. What is the decision?",
    explanation: "If both the goalkeeper and an attacking player commit an offence and the ball enters the goal, the goal is not awarded as the attacking team committed the first offence. The kick is not retaken.",
    answers: [
      { label: "Goal is not awarded; indirect free kick to defending team", isCorrect: true },
      { label: "Goal is awarded", isCorrect: false },
      { label: "Penalty kick is retaken", isCorrect: false },
      { label: "Direct free kick to defending team", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 14,
    text: "At a penalty kick, the kicker feints after completing the run-up. What is the decision?",
    explanation: "Feinting in the run-up to take a penalty kick is permitted. Feinting to kick the ball once the player has completed the run-up is not permitted and the kicker is cautioned.",
    answers: [
      { label: "Indirect free kick to defending team; caution the kicker", isCorrect: true },
      { label: "Allow play to continue", isCorrect: false },
      { label: "Retake the penalty kick with no caution", isCorrect: false },
      { label: "Direct free kick to defending team", isCorrect: false },
    ],
  },

  // ============================================
  // LAW 15 - THE THROW-IN
  // ============================================
  {
    lawNumbers: [ 15,
    text: "A player takes a throw-in with one foot completely off the ground. What is the decision?",
    explanation: "At the moment of delivering the ball, the thrower must have part of each foot on the touchline or on the ground outside the touchline. If not, the throw-in is awarded to the opponents.",
    answers: [
      { label: "Throw-in to the opposing team", isCorrect: true },
      { label: "Retake the throw-in", isCorrect: false },
      { label: "Indirect free kick to the opponents", isCorrect: false },
      { label: "Play continues if no advantage gained", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 15,
    text: "A player throws the ball directly into the opponents' goal from a throw-in. What is the decision?",
    explanation: "A goal cannot be scored directly from a throw-in. If the ball enters the opponents' goal, a goal kick is awarded.",
    answers: [
      { label: "Goal kick to the opponents", isCorrect: true },
      { label: "Goal is awarded", isCorrect: false },
      { label: "Corner kick", isCorrect: false },
      { label: "Throw-in is retaken", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 15,
    text: "A player takes a throw-in from the wrong position (about 3 metres away from where the ball went out). What happens?",
    explanation: "If a throw-in is taken from the wrong position, the throw-in is retaken by the same team from the correct position.",
    answers: [
      { label: "Throw-in is retaken by the same team from the correct position", isCorrect: true },
      { label: "Throw-in to the opposing team", isCorrect: false },
      { label: "Indirect free kick to opponents", isCorrect: false },
      { label: "Play continues regardless", isCorrect: false },
    ],
  },

  // ============================================
  // LAW 16 - THE GOAL KICK
  // ============================================
  {
    lawNumbers: [ 16,
    text: "A goal kick is taken and the ball goes directly into the opponents' goal. Is this a goal?",
    explanation: "A goal may be scored directly from a goal kick, but only against the opposing team (not an own goal).",
    answers: [
      { label: "Yes, a goal is awarded", isCorrect: true },
      { label: "No, the ball must be touched by another player first", isCorrect: false },
      { label: "Corner kick to the opponents", isCorrect: false },
      { label: "Goal kick is retaken", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 16,
    text: "A goal kick is taken but the wind blows the ball back into the kicker's own goal. What is the decision?",
    explanation: "A goal cannot be scored directly into the kicker's own goal from a goal kick. If this happens, a corner kick is awarded.",
    answers: [
      { label: "Corner kick to the opponents", isCorrect: true },
      { label: "Own goal is awarded", isCorrect: false },
      { label: "Goal kick is retaken", isCorrect: false },
      { label: "Dropped ball", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 16,
    text: "At a goal kick, an opponent enters the penalty area before the ball is in play. What happens?",
    explanation: "Opponents must be outside the penalty area until the ball is in play. If an opponent enters before and touches the ball, the goal kick is retaken. If they interfere without touching the ball, play continues.",
    answers: [
      { label: "Goal kick is retaken if the opponent touches the ball", isCorrect: true },
      { label: "Indirect free kick to the defending team", isCorrect: false },
      { label: "Goal kick always retaken", isCorrect: false },
      { label: "Direct free kick to the defending team", isCorrect: false },
    ],
  },

  // ============================================
  // LAW 17 - THE CORNER KICK
  // ============================================
  {
    lawNumbers: [ 17,
    text: "A corner kick is taken and the ball goes directly into the opponents' goal. Is this a goal?",
    explanation: "A goal may be scored directly from a corner kick, but only against the opposing team.",
    answers: [
      { label: "Yes, a goal is awarded", isCorrect: true },
      { label: "No, the ball must be touched by another player first", isCorrect: false },
      { label: "Goal kick to the opponents", isCorrect: false },
      { label: "Corner kick is retaken", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 17,
    text: "A corner kick is taken and goes directly into the kicker's own goal. What is the decision?",
    explanation: "A goal cannot be scored directly into the kicker's own goal from a corner kick. If this happens, a corner kick is awarded to the opponents.",
    answers: [
      { label: "Corner kick to the opponents", isCorrect: true },
      { label: "Own goal is awarded", isCorrect: false },
      { label: "Goal kick to the kicking team", isCorrect: false },
      { label: "The corner kick is retaken", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 17,
    text: "At a corner kick, a defending player stands less than 9.15m from the corner arc despite being asked to move. What should the referee do?",
    explanation: "Opponents must remain at least 9.15m from the corner arc until the ball is in play. If they refuse, the corner kick is still taken but the player may be cautioned for failing to respect the required distance.",
    answers: [
      { label: "Allow the kick to be taken; caution the player for failing to respect distance", isCorrect: true },
      { label: "Delay the kick until the player moves", isCorrect: false },
      { label: "Send off the player for unsporting behaviour", isCorrect: false },
      { label: "Award an indirect free kick to the attacking team", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 17,
    text: "The corner flag is knocked over by the player taking the corner kick. What happens?",
    explanation: "The corner flagpost must be replaced before play continues. If a player deliberately removes the corner flag to take a kick, they must be cautioned.",
    answers: [
      { label: "Replace the flag before continuing; caution if deliberately removed", isCorrect: true },
      { label: "Continue play; replace the flag at the next stoppage", isCorrect: false },
      { label: "Award an indirect free kick to the defending team", isCorrect: false },
      { label: "Abandon the match if the flag cannot be replaced", isCorrect: false },
    ],
  },
];

async function importIFABFAQs() {
  console.log("Starting IFAB FAQ import...");

  // Find the Laws of the Game category
  let lotgCategory = await prisma.category.findUnique({
    where: { slug: "laws-of-the-game" },
  });

  if (!lotgCategory) {
    console.log("Creating Laws of the Game category...");
    lotgCategory = await prisma.category.create({
      data: {
        name: "Laws of the Game",
        slug: "laws-of-the-game",
        type: CategoryType.LOTG,
        description: "Official IFAB Laws of the Game questions",
        order: 1,
      },
    });
  }

  console.log(`Found/created category: ${lotgCategory.name} (${lotgCategory.id})`);

  let importedCount = 0;
  let skippedCount = 0;

  for (const faq of ifabFAQs) {
    // Check if question already exists (by exact text match)
    const existingQuestion = await prisma.question.findFirst({
      where: {
        text: faq.text,
        categoryId: lotgCategory.id,
      },
    });

    if (existingQuestion) {
      console.log(`Skipping existing question: "${faq.text.substring(0, 50)}..."`);
      skippedCount++;
      continue;
    }

    // Create the question with answer options
    const question = await prisma.question.create({
      data: {
        type: QuestionType.LOTG_TEXT,
        categoryId: lotgCategory.id,
        lawNumbers: faq.lawNumbers || [],
        text: faq.text,
        explanation: faq.explanation,
        difficulty: 2, // Medium difficulty by default
        answerOptions: {
          create: faq.answers.map((answer, idx) => ({
            label: answer.label,
            code: `OPT_${idx}`,
            isCorrect: answer.isCorrect,
            order: idx,
          })),
        },
      },
    });

    console.log(`Imported: Law ${faq.lawNumbers[0]} - "${faq.text.substring(0, 50)}..."`);
    importedCount++;
  }

  console.log("\n========================================");
  console.log(`Import complete!`);
  console.log(`Imported: ${importedCount} questions`);
  console.log(`Skipped: ${skippedCount} questions (already exist)`);
  console.log(`Total FAQs processed: ${ifabFAQs.length}`);
  console.log("========================================\n");

  // Print summary by law
  console.log("Questions by Law:");
  const lawCounts = {};
  for (const faq of ifabFAQs) {
    const lawNum = faq.lawNumbers[0];
    lawCounts[lawNum] = (lawCounts[lawNum] || 0) + 1;
  }
  for (let law = 1; law <= 17; law++) {
    if (lawCounts[law]) {
      console.log(`  Law ${law}: ${lawCounts[law]} questions`);
    }
  }
}

importIFABFAQs()
  .catch((e) => {
    console.error("Error importing FAQs:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
