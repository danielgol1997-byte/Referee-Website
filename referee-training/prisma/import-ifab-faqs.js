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
    lawNumbers: [ 1 ],
    text: "The crossbar becomes broken during the match. What is the correct decision?",
    explanation: "If the crossbar becomes displaced or broken, play is stopped until it has been repaired or replaced. If repair or replacement is not possible, the match must be abandoned. The use of a rope or any flexible or dangerous material to replace the crossbar is not permitted.",
    answers: [
      { label: "Stop play until the crossbar is repaired or replaced; abandon the match if repair is not possible", isCorrect: true },
      { label: "Continue play as long as both teams agree to play without a functional crossbar", isCorrect: false },
      { label: "Replace the crossbar with a rope or flexible material and continue the match", isCorrect: false },
      { label: "Abandon the match immediately; a broken crossbar cannot be repaired during the match", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 1 ],
    text: "The referee enters the field of play for the pre-match inspection and sees that one corner flag is missing or the goalposts/crossbar are grey (not white). What should the referee do?",
    explanation: "The referee must ensure all mandatory field markings and equipment are correct before the match. Corner flags are mandatory and must be present. Goalposts and crossbar must be white. The referee should not start the match until these issues are corrected.",
    answers: [
      { label: "Do not start the match until the missing corner flag is replaced and the goalposts/crossbar are white", isCorrect: true },
      { label: "Start the match and note the equipment issues in the match report", isCorrect: false },
      { label: "Start the match if both team captains agree to the conditions", isCorrect: false },
      { label: "Abandon the match; equipment deficiencies cannot be corrected once the teams have arrived", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 1 ],
    text: "A substitute enters the video operation room (VOR) during a match. The referee is informed about this incident when play next stops. What is the correct procedure?",
    explanation: "A substitute entering the VOR is misconduct. The substitute must be cautioned for entering a restricted area and must leave the VOR immediately.",
    answers: [
      { label: "Caution (yellow card) the substitute for entering a restricted area; order them to leave the VOR", isCorrect: true },
      { label: "Sending-off (red card) the substitute for interfering with the VAR process", isCorrect: false },
      { label: "Verbal warning only; substitutes are not active participants so no card is needed", isCorrect: false },
      { label: "No disciplinary sanction; the matter is reported to the match commissioner after the match", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 1 ],
    text: "A coach enters the referee review area when the referee undertakes an on-field review. What is the correct procedure?",
    explanation: "Only the referee is permitted in the referee review area (RRA) during an on-field review. Any person who enters the RRA must be cautioned.",
    answers: [
      { label: "Caution (yellow card) the coach for entering the referee review area", isCorrect: true },
      { label: "Sending-off (red card) the coach for interfering with the referee's decision-making", isCorrect: false },
      { label: "Verbal warning only; the coach should be directed to leave the RRA", isCorrect: false },
      { label: "No action required; coaches are permitted to observe the on-field review alongside the referee", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 1 ],
    text: "The referee initiates an on-field review for a serious missed incident in the penalty area. A player enters the referee review area when the referee is watching the replay footage. What is the correct procedure?",
    explanation: "Only the referee is permitted in the RRA during an on-field review. Any player who enters the RRA must be cautioned for unsporting behaviour.",
    answers: [
      { label: "Caution (yellow card) the player for unsporting behaviour for entering the referee review area", isCorrect: true },
      { label: "Sending-off (red card) the player for interfering with the referee during a review", isCorrect: false },
      { label: "Verbal warning; no disciplinary sanction is needed as play is already stopped", isCorrect: false },
      { label: "No disciplinary sanction; the incident is ignored because play was stopped for the review", isCorrect: false },
    ],
  },

  // ============================================
  // LAW 2 - THE BALL
  // ============================================
  {
    lawNumbers: [ 2 ],
    text: "During a match, the ball bursts when it is kicked by a player and goes into the goal. What is the correct decision?",
    explanation: "If the ball becomes defective at the moment it is kicked and subsequently enters the goal, the goal is not awarded. Play is restarted with a dropped ball.",
    answers: [
      { label: "No goal; play restarts with a dropped ball from where the ball became defective", isCorrect: true },
      { label: "Goal awarded; the ball crossed the goal line before the defect was noticed", isCorrect: false },
      { label: "The kick is retaken with a new ball from the same position", isCorrect: false },
      { label: "Indirect free kick to the defending team from where the ball was kicked", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 2 ],
    text: "The ball hits the referee and goes directly into the goal. What is the correct decision?",
    explanation: "If the ball becomes in play and touches the referee (or other match official), play continues unless the ball goes into the goal, team possession changes or a promising attack starts. If the ball goes into the goal after touching the referee, the goal is not awarded and play restarts with a dropped ball.",
    answers: [
      { label: "No goal; play restarts with a dropped ball", isCorrect: true },
      { label: "Goal awarded; the referee is considered part of the field of play", isCorrect: false },
      { label: "Indirect free kick to the defending team for referee interference", isCorrect: false },
      { label: "Corner kick to the attacking team as the ball was last touched by the referee", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 2 ],
    text: "During the match, an extra ball is on the field and interferes with play. What should the referee do?",
    explanation: "If an extra ball, other object or animal enters the field of play during the match, the referee must stop play only if it interferes with play. Play is restarted with a dropped ball.",
    answers: [
      { label: "Stop play and restart with a dropped ball", isCorrect: true },
      { label: "Continue play and remove the extra ball at the next stoppage in play", isCorrect: false },
      { label: "Indirect free kick to the team that was in possession when play was stopped", isCorrect: false },
      { label: "Abandon the match due to external interference with play", isCorrect: false },
    ],
  },

  // ============================================
  // LAW 3 - THE PLAYERS
  // ============================================
  {
    lawNumbers: [ 3 ],
    text: "A substitute enters the field during play without permission and interferes with play. What is the correct decision?",
    explanation: "If a substitute enters the field without the referee's permission, the referee stops play (not immediately if the substitute does not interfere with play). The substitute is cautioned and play restarts with an indirect free kick from where the ball was when play was stopped.",
    answers: [
      { label: "Stop play; caution (yellow card) the substitute; indirect free kick from where the ball was when play was stopped", isCorrect: true },
      { label: "Stop play; sending-off (red card) the substitute; direct free kick from where the interference occurred", isCorrect: false },
      { label: "Stop play; verbal warning to the substitute; dropped ball from where the ball was", isCorrect: false },
      { label: "Allow play to continue and apply advantage; deal with the substitute at the next stoppage", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 3 ],
    text: "A team official enters the field of play and interferes with play. What is the correct decision?",
    explanation: "If a team official enters the field of play, the referee must stop play (not immediately if the team official does not interfere with play) and have the team official removed. The appropriate disciplinary action is taken. If interfering with play, the restart is a direct free kick or penalty kick.",
    answers: [
      { label: "Stop play; remove the official and take appropriate disciplinary action; direct free kick (or penalty kick if in the penalty area)", isCorrect: true },
      { label: "Stop play; remove the official; indirect free kick from where the ball was", isCorrect: false },
      { label: "Stop play; remove the official; dropped ball from where the ball was", isCorrect: false },
      { label: "Continue play and remove the official at the next stoppage in play", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 3 ],
    text: "A player who has left the field to correct equipment re-enters without the referee's permission and scores a goal. What happens?",
    explanation: "A player who re-enters without permission must be cautioned. If the player interfered with play (scoring a goal is interference), the goal is disallowed and play restarts with an indirect free kick.",
    answers: [
      { label: "Goal disallowed; caution (yellow card) the player for entering without permission; indirect free kick", isCorrect: true },
      { label: "Goal awarded; caution (yellow card) the player at the next stoppage", isCorrect: false },
      { label: "Goal disallowed; no disciplinary sanction is needed as the player was correcting equipment", isCorrect: false },
      { label: "Goal awarded if the player's equipment is now correct; no further action", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 3 ],
    text: "During kicks from the penalty mark, a player is injured and cannot continue. The team has already used all substitutions. What happens?",
    explanation: "During kicks from the penalty mark, if a kicker is injured and cannot continue, they may be replaced by a player excluded from the kicks. However, if no substitutes are available and no excluded players can take their place, the team continues with fewer kickers.",
    answers: [
      { label: "The team continues with one fewer kicker if no eligible replacement is available", isCorrect: true },
      { label: "The match is abandoned and must be replayed", isCorrect: false },
      { label: "The injured player must still attempt to take the kick", isCorrect: false },
      { label: "The opposing team must also reduce their number of kickers to equalise", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 3 ],
    text: "A team starts a match with 10 players. The 11th player arrives after the match has started. Can they join the match?",
    explanation: "A player whose name is on the team list may enter the field of play to join the match at any time but only during a stoppage in play and after being checked by the referee.",
    answers: [
      { label: "Yes; the player may enter during a stoppage in play after being checked by the referee", isCorrect: true },
      { label: "No; a player who is not present at kick-off cannot participate in the match", isCorrect: false },
      { label: "Only at half-time, with the referee's permission", isCorrect: false },
      { label: "Only with the permission of the opposing team captain", isCorrect: false },
    ],
  },

  // ============================================
  // LAW 4 - THE PLAYERS' EQUIPMENT
  // ============================================
  {
    lawNumbers: [ 4 ],
    text: "A player is wearing jewelry that cannot be removed. What should the referee do?",
    explanation: "Players must not wear any jewelry (including rings, watches, bracelets, earrings, leather bands, rubber bands, etc.). If jewelry cannot be removed, the player must not participate.",
    answers: [
      { label: "The player must not participate in the match until the jewelry is removed", isCorrect: true },
      { label: "The player may participate if the jewelry is securely taped over", isCorrect: false },
      { label: "The player may participate with written consent from both team captains", isCorrect: false },
      { label: "The player may participate but the issue must be noted in the match report", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 4 ],
    text: "A goalkeeper's jersey is the same colour as the outfield players' jerseys. What should happen?",
    explanation: "The goalkeeper must wear colours that are distinguishable from the other players and the match officials.",
    answers: [
      { label: "The goalkeeper must change to a jersey that is distinguishable from all other players and the match officials", isCorrect: true },
      { label: "The match may proceed if both team captains agree to the colours", isCorrect: false },
      { label: "The outfield players must change their jerseys to a different colour", isCorrect: false },
      { label: "The referee should abandon the match for non-compliance with equipment requirements", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 4 ],
    text: "A player loses their footwear accidentally during play and immediately scores a goal. Is the goal valid?",
    explanation: "If a player accidentally loses their footwear and immediately plays the ball or scores a goal, there is no offence.",
    answers: [
      { label: "Yes; there is no offence when footwear is lost accidentally and the player immediately plays the ball", isCorrect: true },
      { label: "No; the goal is disallowed because the player was not wearing complete equipment", isCorrect: false },
      { label: "Only valid if play continued for fewer than 3 seconds after losing the footwear", isCorrect: false },
      { label: "The referee must stop play immediately for the player to retrieve their footwear", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 4 ],
    text: "A player is wearing undershorts that extend below the main shorts. What colour must they be?",
    explanation: "Undershorts/tights must be the same colour as the main colour of the shorts or the lowest part of the shorts.",
    answers: [
      { label: "The same colour as the main colour of the shorts or the lowest part of the shorts", isCorrect: true },
      { label: "Any colour, provided all players of the same team wear the same colour undershorts", isCorrect: false },
      { label: "Only black or white are permitted", isCorrect: false },
      { label: "The same colour as the team's socks", isCorrect: false },
    ],
  },

  // ============================================
  // LAW 5 - THE REFEREE
  // ============================================
  {
    lawNumbers: [ 5 ],
    text: "A referee realises that they made an error in allowing play to continue. Can they change their decision?",
    explanation: "The referee may change a decision on realising that it is incorrect or on the advice of another match official, provided play has not already restarted or the referee has not signalled the end of the first or second half (including extra time) and left the field of play.",
    answers: [
      { label: "Yes; provided play has not already restarted or the referee has not signalled the end of the half/match", isCorrect: true },
      { label: "No; all decisions are final once communicated to the players", isCorrect: false },
      { label: "Only with the agreement of both team captains", isCorrect: false },
      { label: "Only if the VAR recommends the change", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 5 ],
    text: "The referee gives a yellow card to the wrong player (mistaken identity). When can this be corrected?",
    explanation: "If the referee shows a card to the wrong player because of mistaken identity, they may correct the error if they have not already restarted play or signalled the end of the half/match.",
    answers: [
      { label: "Before play has restarted or the referee has signalled the end of the half/match", isCorrect: true },
      { label: "At any time during the match, including after play has restarted", isCorrect: false },
      { label: "Only at half-time or after the match in the match report", isCorrect: false },
      { label: "Only if the VAR identifies the correct player", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 5 ],
    text: "The VAR recommends an on-field review (OFR). Must the referee accept the recommendation?",
    explanation: "The referee is not obliged to accept the VAR's recommendation but should do so unless there is a clear reason to reject it.",
    answers: [
      { label: "No; the referee is not obliged but should accept unless there is a clear reason to reject it", isCorrect: true },
      { label: "Yes; the referee must always accept the VAR's recommendation for an on-field review", isCorrect: false },
      { label: "No; the referee may freely ignore any VAR recommendation without justification", isCorrect: false },
      { label: "Only for potential red card or penalty kick decisions", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 5 ],
    text: "What signal does the referee make before reviewing the VAR monitor?",
    explanation: "The referee makes the TV signal (drawing a rectangle) before going to the referee review area for an on-field review.",
    answers: [
      { label: "The TV signal — outlining a rectangle with both hands", isCorrect: true },
      { label: "Blowing the whistle and pointing directly towards the monitor", isCorrect: false },
      { label: "Raising both hands above the head", isCorrect: false },
      { label: "No specific signal is required before going to the review area", isCorrect: false },
    ],
  },

  // ============================================
  // LAW 6 - THE OTHER MATCH OFFICIALS
  // ============================================
  {
    lawNumbers: [ 6 ],
    text: "The assistant referee signals for offside but the referee decides it is not offside. Who has the final decision?",
    explanation: "The referee has the final decision on all facts connected with play and may overrule an assistant referee's decision.",
    answers: [
      { label: "The referee has the final decision and may overrule the assistant referee", isCorrect: true },
      { label: "The assistant referee's flag signal is always the final decision on offside matters", isCorrect: false },
      { label: "The VAR must be consulted before the referee can overrule the assistant referee", isCorrect: false },
      { label: "The two officials must discuss and reach agreement before the decision is final", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 6 ],
    text: "An assistant referee sees a serious foul play incident outside the referee's view. What should they do?",
    explanation: "The assistant referee may enter the field of play to help control situations such as violent confrontations. They should signal to the referee and report what they saw.",
    answers: [
      { label: "Raise the flag to signal the referee and report the incident that was outside the referee's view", isCorrect: true },
      { label: "Wait until the next stoppage in play to inform the referee of the incident", isCorrect: false },
      { label: "Take no action as the incident occurred outside the assistant referee's designated area of responsibility", isCorrect: false },
      { label: "Show a disciplinary card directly to the offending player", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 6 ],
    text: "The fourth official indicates there should be 4 minutes of added time. The referee decides to add 6 minutes. Is this allowed?",
    explanation: "The fourth official indicates the minimum additional time decided by the referee at the end of the final minute of each half. The referee may increase, but not reduce, this time.",
    answers: [
      { label: "Yes; the indicated time is the minimum — the referee may increase but not reduce it", isCorrect: true },
      { label: "No; the time displayed by the fourth official must be followed exactly", isCorrect: false },
      { label: "Yes; the referee may freely increase or reduce the indicated additional time", isCorrect: false },
      { label: "Only the VAR can authorise additional time beyond what the fourth official indicated", isCorrect: false },
    ],
  },

  // ============================================
  // LAW 7 - THE DURATION OF THE MATCH
  // ============================================
  {
    lawNumbers: [ 7 ],
    text: "A penalty kick is to be taken at the end of the first half. Half-time has begun and players have left the field. Can the penalty still be taken?",
    explanation: "If a penalty kick has to be taken or retaken, the half is extended until the penalty kick is completed. Players may return to the field to take/defend the kick.",
    answers: [
      { label: "Yes; the half is extended until the penalty kick is completed — players return to the field", isCorrect: true },
      { label: "No; the penalty is carried over and taken at the start of the second half", isCorrect: false },
      { label: "No; once the whistle for half-time has been blown the penalty is cancelled", isCorrect: false },
      { label: "Yes; but only the kicker and goalkeeper are required on the field for the kick", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 7 ],
    text: "A goal is scored in added time. Should the referee add more time?",
    explanation: "The referee allows for all time lost during the half, including time for goal celebrations. Time lost for celebrating a goal should be added.",
    answers: [
      { label: "Yes; the referee must add the time lost for goal celebrations to additional time", isCorrect: true },
      { label: "No; the displayed additional time is the maximum and cannot be extended", isCorrect: false },
      { label: "Only if the celebrations were deemed excessive by the referee", isCorrect: false },
      { label: "No; the scoring of a goal signals the end of the half immediately", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 7 ],
    text: "Heavy rain makes the field unplayable during a match. What should the referee do?",
    explanation: "If weather conditions worsen to the extent that the field becomes unplayable, the referee may suspend the match temporarily. If conditions do not improve sufficiently, the match is abandoned.",
    answers: [
      { label: "Suspend the match temporarily; abandon if conditions do not improve sufficiently", isCorrect: true },
      { label: "Continue play regardless of the conditions until the half ends", isCorrect: false },
      { label: "Abandon the match immediately without attempting a temporary suspension", isCorrect: false },
      { label: "Award the match to the team that was winning at the time play was stopped", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 7 ],
    text: "The first half ends without the referee blowing the whistle for half-time. What happens?",
    explanation: "The half ends only when the referee signals the end by blowing the whistle. If the referee forgets, play should continue.",
    answers: [
      { label: "Play continues until the referee signals for half-time by blowing the whistle", isCorrect: true },
      { label: "The half ends automatically after 45 minutes have elapsed on the clock", isCorrect: false },
      { label: "The fourth official should signal the end of the half on behalf of the referee", isCorrect: false },
      { label: "Either team captain may request the referee to end the half", isCorrect: false },
    ],
  },

  // ============================================
  // LAW 8 - THE START AND RESTART OF PLAY
  // ============================================
  {
    lawNumbers: [ 8 ],
    text: "A goal is scored directly from the kick-off without the ball touching any other player. Is the goal valid?",
    explanation: "A goal may be scored directly from the kick-off against the opponents. A goal cannot be scored against the team taking the kick-off.",
    answers: [
      { label: "Yes; a goal may be scored directly from the kick-off against the opposing team", isCorrect: true },
      { label: "No; at least one other player must touch the ball before a goal can be scored from kick-off", isCorrect: false },
      { label: "Only if the kick was clearly intentional and not a miskick", isCorrect: false },
      { label: "A goal can never be scored directly from a kick-off; an own goal from kick-off is also not possible", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 8 ],
    text: "After a dropped ball, the ball goes directly into the goal without touching any player. What is the decision?",
    explanation: "If a dropped ball enters the goal without touching at least two players, play is restarted with a goal kick or corner kick depending on which goal.",
    answers: [
      { label: "No goal; goal kick if it enters the opponents' goal, corner kick if it enters the team's own goal", isCorrect: true },
      { label: "Goal awarded; the ball legally crossed the goal line", isCorrect: false },
      { label: "The dropped ball is retaken from the same position", isCorrect: false },
      { label: "Indirect free kick to the defending team from the goal area", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 8 ],
    text: "The referee stops play because the ball has hit them and changed possession. How is play restarted?",
    explanation: "When play is stopped because the ball touched a match official and changed possession, it is restarted with a dropped ball for the team that last touched the ball.",
    answers: [
      { label: "Dropped ball for the team that last touched the ball before it hit the match official", isCorrect: true },
      { label: "Dropped ball contested equally by both teams", isCorrect: false },
      { label: "Throw-in to the team that did not last touch the ball", isCorrect: false },
      { label: "Play continues; the referee is part of the field of play and no stoppage is needed", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 8 ],
    text: "For a dropped ball, where is the ball dropped if play was stopped in the penalty area?",
    explanation: "If play was stopped in the penalty area, the ball is dropped for the goalkeeper of the team that was in possession in the penalty area.",
    answers: [
      { label: "The ball is dropped for the goalkeeper of the team in possession, inside their penalty area", isCorrect: true },
      { label: "The ball is dropped on the edge of the penalty area line", isCorrect: false },
      { label: "The ball is dropped at the penalty mark", isCorrect: false },
      { label: "The ball is dropped outside the penalty area for any player of the team in possession", isCorrect: false },
    ],
  },

  // ============================================
  // LAW 9 - THE BALL IN AND OUT OF PLAY
  // ============================================
  {
    lawNumbers: [ 9 ],
    text: "The ball hits the corner flag and bounces back into play. Is the ball still in play?",
    explanation: "The ball is in play if it rebounds from a goalpost, crossbar, corner flagpost and remains on the field of play.",
    answers: [
      { label: "Yes; the ball remains in play as the corner flagpost is considered part of the field of play", isCorrect: true },
      { label: "No; a corner kick is awarded to the attacking team", isCorrect: false },
      { label: "No; a throw-in is awarded to the opposing team", isCorrect: false },
      { label: "Play is stopped and restarted with a dropped ball", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 9 ],
    text: "The ball hits the referee and goes out of play over the touchline. What is the restart?",
    explanation: "If the ball goes out of play after touching a match official, play restarts according to where it left the field - in this case, a throw-in.",
    answers: [
      { label: "Throw-in to the team that did not last play the ball before it struck the match official", isCorrect: true },
      { label: "Dropped ball from where the ball hit the match official", isCorrect: false },
      { label: "Throw-in to the team that last played the ball before it hit the match official", isCorrect: false },
      { label: "Indirect free kick to the team that was in possession", isCorrect: false },
    ],
  },

  // ============================================
  // LAW 10 - DETERMINING THE OUTCOME
  // ============================================
  {
    lawNumbers: [ 10 ],
    text: "The ball crosses the goal line between the posts, but the referee does not see it and awards a corner kick. VAR reviews and confirms it was a goal. What happens?",
    explanation: "VAR can only be used for clear and obvious errors or serious missed incidents relating to goals. If VAR confirms the ball crossed the line, the goal should be awarded.",
    answers: [
      { label: "The goal is awarded on the basis of the VAR review — a clear and obvious error is corrected", isCorrect: true },
      { label: "The corner kick stands as the referee's original on-field decision", isCorrect: false },
      { label: "Dropped ball at the goal area line", isCorrect: false },
      { label: "Penalty kick to the attacking team to compensate for the missed goal", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 10 ],
    text: "During kicks from the penalty mark, the goalkeeper saves a kick but moves off the goal line before the ball is kicked. What is the decision?",
    explanation: "If the goalkeeper commits an offence and the kick is saved, the kick is retaken and the goalkeeper is cautioned (unless the kick needed to be retaken for another reason).",
    answers: [
      { label: "The kick is retaken and the goalkeeper is cautioned (yellow card) for the offence", isCorrect: true },
      { label: "The save stands; the goalkeeper's movement before the kick is acceptable", isCorrect: false },
      { label: "A goal is automatically awarded to the kicking team", isCorrect: false },
      { label: "The kicking team forfeits their kick due to the goalkeeper's encroachment", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 10 ],
    text: "During kicks from the penalty mark, both teams have taken 5 kicks and the score is level. What happens next?",
    explanation: "If after 5 kicks the scores are level, kicks continue until one team has scored a goal more than the other from the same number of kicks.",
    answers: [
      { label: "Kicks continue on a sudden-death basis — one kick each until one team is ahead after the same number of kicks", isCorrect: true },
      { label: "Another full round of five kicks per team is taken", isCorrect: false },
      { label: "The match is declared a draw", isCorrect: false },
      { label: "A coin toss determines the winner", isCorrect: false },
    ],
  },

  // ============================================
  // LAW 11 - OFFSIDE
  // ============================================
  {
    lawNumbers: [ 11 ],
    text: "An attacker in an offside position receives the ball directly from a goal kick. Is this offside?",
    explanation: "There is no offside offence if a player receives the ball directly from a goal kick.",
    answers: [
      { label: "No; there is no offside offence if the ball is received directly from a goal kick, throw-in, or corner kick", isCorrect: true },
      { label: "Yes; the offside law applies to all restarts of play including goal kicks", isCorrect: false },
      { label: "Only offside if the receiving player was inside the penalty area at the time of the kick", isCorrect: false },
      { label: "Only offside if the receiving player scored directly from the goal kick", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 11 ],
    text: "An attacker in an offside position is behind the ball when it is played by a teammate. Is this offside?",
    explanation: "A player is in an offside position if any part of the head, body or feet is nearer to the opponents' goal line than both the ball and the second-last opponent. If behind the ball, they cannot be offside.",
    answers: [
      { label: "No; a player level with or behind the ball when it is played cannot be in an offside position", isCorrect: true },
      { label: "Yes; any player in the opponents' half can be in an offside position", isCorrect: false },
      { label: "Yes; if the player subsequently becomes involved in active play they are offside", isCorrect: false },
      { label: "Only offside if the player is closer to the goal line than the goalkeeper", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 11 ],
    text: "A defender deliberately plays the ball but it goes to an attacker who was in an offside position. Is this offside?",
    explanation: "A player in an offside position receiving the ball from an opponent who deliberately plays the ball is not offside, unless it was a deliberate save.",
    answers: [
      { label: "Not offside; a player receiving the ball from an opponent who deliberately played it is not offside, unless it was a deliberate save", isCorrect: true },
      { label: "Offside; it is always an offside offence if the attacker was in an offside position regardless of who last played the ball", isCorrect: false },
      { label: "Not offside only if the defender was outside their own penalty area when they played the ball", isCorrect: false },
      { label: "The assistant referee decides based on the intent of the defender's action", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 11 ],
    text: "An attacker in an offside position clearly obstructs the goalkeeper's line of vision. What is the decision?",
    explanation: "A player in an offside position commits an offside offence if they interfere with an opponent by preventing an opponent from playing or being able to play the ball by clearly obstructing the opponent's line of vision.",
    answers: [
      { label: "Offside offence; the player interfered with an opponent by clearly obstructing the goalkeeper's line of vision", isCorrect: true },
      { label: "Not offside; a player must touch the ball to commit an offside offence", isCorrect: false },
      { label: "Indirect free kick for obstruction — a separate offence, not related to offside", isCorrect: false },
      { label: "Play on; obstructing the goalkeeper's view is only penalised if the goalkeeper appeals", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 11 ],
    text: "An attacker in an offside position runs toward the ball but a teammate who was onside gets there first and plays the ball. Is there an offside offence?",
    explanation: "Moving towards or running towards the ball does not commit an offside offence if the player does not play or touch the ball and does not interfere with an opponent.",
    answers: [
      { label: "No offside offence; merely running towards the ball is not an offence if the player does not play the ball or interfere with an opponent", isCorrect: true },
      { label: "Offside; running towards the ball constitutes interfering with play", isCorrect: false },
      { label: "Offside; the player's run towards the ball distracted the defending team", isCorrect: false },
      { label: "The flag should be raised for delayed offside when the player started running", isCorrect: false },
    ],
  },

  // ============================================
  // LAW 12 - FOULS AND MISCONDUCT
  // ============================================
  {
    lawNumbers: [ 12 ],
    text: "A defender handles the ball to prevent a goal but the ball still goes into the goal. What is the decision?",
    explanation: "If a player denies a goal or obvious goal-scoring opportunity by handling the ball but a goal is scored, the player is cautioned (not sent off) and the goal stands.",
    answers: [
      { label: "Goal awarded; the defender is cautioned (yellow card) — not sent off — because the goal was scored despite the handball", isCorrect: true },
      { label: "Goal awarded; the defender is sent off (red card) for denying an obvious goal-scoring opportunity by handball", isCorrect: false },
      { label: "Goal disallowed; penalty kick awarded for the deliberate handball", isCorrect: false },
      { label: "Goal awarded; no disciplinary sanction as the handling did not prevent the goal", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 12 ],
    text: "A player uses excessive force against an opponent during a challenge for the ball. What is the sanction?",
    explanation: "Using excessive force is when a player exceeds the necessary use of force and/or endangers the safety of an opponent. A player who uses excessive force must be sent off.",
    answers: [
      { label: "Direct free kick (or penalty kick if in the penalty area); sending-off (red card) for serious foul play", isCorrect: true },
      { label: "Direct free kick; caution (yellow card) for a reckless challenge", isCorrect: false },
      { label: "Indirect free kick; sending-off (red card)", isCorrect: false },
      { label: "Verbal warning; excessive force is a matter of the referee's subjective judgement", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 12 ],
    text: "A goalkeeper inside their penalty area handles a deliberate back-pass from a teammate. What is the decision?",
    explanation: "If a goalkeeper handles the ball from a deliberate kick by a teammate, it is an indirect free kick offence. No card is given unless it prevents a goal or denies an obvious goal-scoring opportunity.",
    answers: [
      { label: "Indirect free kick from where the goalkeeper handled the ball; no disciplinary sanction unless it denies a goal or DOGSO", isCorrect: true },
      { label: "Direct free kick from where the goalkeeper handled the ball", isCorrect: false },
      { label: "Penalty kick; the goalkeeper deliberately handled the ball inside the penalty area", isCorrect: false },
      { label: "Dropped ball; the back-pass was unintentional by the teammate", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 12 ],
    text: "A player commits a reckless challenge. What is the correct sanction?",
    explanation: "Reckless is when a player acts with disregard to the danger to, or consequences for, an opponent. A player who acts recklessly must be cautioned.",
    answers: [
      { label: "Direct free kick; caution (yellow card) for acting with disregard to the danger or consequences for an opponent", isCorrect: true },
      { label: "Direct free kick only; no disciplinary sanction is required for a careless challenge", isCorrect: false },
      { label: "Indirect free kick; caution (yellow card) for unsporting behaviour", isCorrect: false },
      { label: "Direct free kick; sending-off (red card) for serious foul play", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 12 ],
    text: "A player denies an obvious goal-scoring opportunity by fouling an opponent in the penalty area, but was genuinely attempting to play the ball. What is the decision?",
    explanation: "If a player commits a foul that denies an obvious goal-scoring opportunity in the penalty area but was making a genuine attempt to play the ball, the player is cautioned (not sent off), and a penalty kick is awarded.",
    answers: [
      { label: "Penalty kick; caution (yellow card) — not sent off — because the player made a genuine attempt to play the ball", isCorrect: true },
      { label: "Penalty kick; sending-off (red card) for denying an obvious goal-scoring opportunity", isCorrect: false },
      { label: "Direct free kick outside the penalty area; sending-off (red card)", isCorrect: false },
      { label: "Penalty kick only; no disciplinary sanction when a genuine attempt to play the ball is made", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 12 ],
    text: "A player spits at an opponent but misses. What is the sanction?",
    explanation: "Spitting at a person is violent conduct and results in a sending off, even if the spit does not make contact.",
    answers: [
      { label: "Sending-off (red card) for violent conduct; spitting at a person is a sending-off offence even if it does not make contact", isCorrect: true },
      { label: "Caution (yellow card) for unsporting behaviour", isCorrect: false },
      { label: "No disciplinary sanction as the spit did not make contact with the opponent", isCorrect: false },
      { label: "Verbal warning only; the incident should be noted in the match report", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 12 ],
    text: "A player commits an offence against an opponent off the field of play during play. What is the restart?",
    explanation: "If a player commits an offence against an opponent off the field while the ball is in play, play is restarted with a direct free kick on the boundary line nearest to where the offence occurred.",
    answers: [
      { label: "Direct free kick on the boundary line nearest to where the offence occurred (or penalty kick if equivalent to inside the penalty area)", isCorrect: true },
      { label: "Dropped ball from where the ball was when play was stopped", isCorrect: false },
      { label: "Indirect free kick from where the ball was at the time of the offence", isCorrect: false },
      { label: "No restart required; play continues as the offence occurred off the field of play", isCorrect: false },
    ],
  },

  // ============================================
  // LAW 13 - FREE KICKS
  // ============================================
  {
    lawNumbers: [ 13 ],
    text: "A free kick is taken quickly and goes directly into the opponent's goal without touching another player. Is the goal valid?",
    explanation: "A goal may be scored directly from a direct free kick. If it is an indirect free kick, the goal is not awarded.",
    answers: [
      { label: "Goal is valid if it was a direct free kick; if an indirect free kick, the goal is not awarded and play restarts with a goal kick", isCorrect: true },
      { label: "Goal is always valid regardless of whether the free kick was direct or indirect", isCorrect: false },
      { label: "No goal; at least one other player must touch the ball before a goal can be scored from any free kick", isCorrect: false },
      { label: "Goal is valid only if the goalkeeper was in position and had a chance to save", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 13 ],
    text: "A defending team forms a wall of 4 players at a free kick in a dangerous position. An attacking player stands within 1 metre of the wall. What should the referee do?",
    explanation: "If there is a 'wall' of three or more defending players, all attacking players must remain at least 1m from the wall until the ball is in play. An indirect free kick is awarded if this is not respected.",
    answers: [
      { label: "If the free kick is taken with the attacker within 1m of the wall, award an indirect free kick to the defending team", isCorrect: true },
      { label: "Allow play to continue; the distance restriction only applies to defending players at free kicks", isCorrect: false },
      { label: "Caution (yellow card) the attacking player and retake the free kick", isCorrect: false },
      { label: "Order the free kick to be retaken from the same position without any disciplinary sanction", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 13 ],
    text: "A player takes a free kick but the ball hits the referee and goes into the goal. What is the decision?",
    explanation: "If a free kick is taken and the ball hits a match official and goes into the goal, the goal is not awarded. Play restarts with a dropped ball.",
    answers: [
      { label: "No goal; play restarts with a dropped ball", isCorrect: true },
      { label: "Goal is awarded; the match official is part of the field of play", isCorrect: false },
      { label: "The free kick is retaken from the original position", isCorrect: false },
      { label: "Indirect free kick to the defending team from where the ball hit the official", isCorrect: false },
    ],
  },

  // ============================================
  // LAW 14 - THE PENALTY KICK
  // ============================================
  {
    lawNumbers: [ 14 ],
    text: "The penalty kicker kicks the ball backwards to a teammate at a penalty kick. What is the decision?",
    explanation: "The ball must be kicked forward. If the ball is kicked backwards, the kick is retaken. The kicker may be cautioned for unsporting behaviour if it is considered to be an attempt to circumvent the Law.",
    answers: [
      { label: "The penalty kick is retaken; the kicker may be cautioned (yellow card) for unsporting behaviour if attempting to circumvent the Law", isCorrect: true },
      { label: "Indirect free kick to the defending team from the penalty mark", isCorrect: false },
      { label: "Play continues from where the teammate received the ball", isCorrect: false },
      { label: "Goal kick to the defending team", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 14 ],
    text: "At a penalty kick, the goalkeeper and a teammate of the kicker both commit an offence before the ball is in play. The ball goes into the goal. What is the decision?",
    explanation: "If both the goalkeeper and an attacking player commit an offence and the ball enters the goal, the goal is not awarded as the attacking team committed the first offence. The kick is not retaken.",
    answers: [
      { label: "Goal not awarded; indirect free kick to the defending team — the attacking team's offence takes priority and the kick is not retaken", isCorrect: true },
      { label: "Goal is awarded; the goalkeeper's offence cancels out the attacker's offence", isCorrect: false },
      { label: "Penalty kick is retaken; both players are cautioned (yellow card)", isCorrect: false },
      { label: "Direct free kick to the defending team from the penalty mark", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 14 ],
    text: "At a penalty kick, the kicker feints after completing the run-up. What is the decision?",
    explanation: "Feinting in the run-up to take a penalty kick is permitted. Feinting to kick the ball once the player has completed the run-up is not permitted and the kicker is cautioned.",
    answers: [
      { label: "Indirect free kick to the defending team; the kicker is cautioned (yellow card) for unsporting behaviour", isCorrect: true },
      { label: "Play continues; feinting is a permitted part of taking a penalty kick", isCorrect: false },
      { label: "The penalty kick is retaken with no disciplinary sanction", isCorrect: false },
      { label: "Direct free kick to the defending team from the penalty mark", isCorrect: false },
    ],
  },

  // ============================================
  // LAW 15 - THE THROW-IN
  // ============================================
  {
    lawNumbers: [ 15 ],
    text: "A player takes a throw-in with one foot completely off the ground. What is the decision?",
    explanation: "At the moment of delivering the ball, the thrower must have part of each foot on the touchline or on the ground outside the touchline. If not, the throw-in is awarded to the opponents.",
    answers: [
      { label: "Throw-in awarded to the opposing team from the same position", isCorrect: true },
      { label: "The throw-in is retaken by the same player", isCorrect: false },
      { label: "Indirect free kick to the opposing team from the touchline", isCorrect: false },
      { label: "Play continues; the referee should not intervene for a minor procedural error", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 15 ],
    text: "A player throws the ball directly into the opponents' goal from a throw-in. What is the decision?",
    explanation: "A goal cannot be scored directly from a throw-in. If the ball enters the opponents' goal, a goal kick is awarded.",
    answers: [
      { label: "No goal; goal kick awarded to the opposing team", isCorrect: true },
      { label: "Goal is awarded", isCorrect: false },
      { label: "Corner kick to the team that took the throw-in", isCorrect: false },
      { label: "The throw-in is retaken from the correct position", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 15 ],
    text: "A player takes a throw-in from the wrong position (about 3 metres away from where the ball went out). What happens?",
    explanation: "If a throw-in is taken from the wrong position, the throw-in is retaken by the same team from the correct position.",
    answers: [
      { label: "The throw-in is retaken by the same team from the correct position on the touchline", isCorrect: true },
      { label: "Throw-in awarded to the opposing team from the correct position", isCorrect: false },
      { label: "Indirect free kick to the opposing team from the touchline", isCorrect: false },
      { label: "Play continues; the referee does not intervene for minor positional errors at throw-ins", isCorrect: false },
    ],
  },

  // ============================================
  // LAW 16 - THE GOAL KICK
  // ============================================
  {
    lawNumbers: [ 16 ],
    text: "A goal kick is taken and the ball goes directly into the opponents' goal. Is this a goal?",
    explanation: "A goal may be scored directly from a goal kick, but only against the opposing team (not an own goal).",
    answers: [
      { label: "Yes; a goal may be scored directly from a goal kick against the opposing team", isCorrect: true },
      { label: "No; at least one other player must touch the ball before a goal can be scored from a goal kick", isCorrect: false },
      { label: "No; corner kick awarded to the opposing team", isCorrect: false },
      { label: "The goal kick must be retaken", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 16 ],
    text: "A goal kick is taken but the wind blows the ball back into the kicker's own goal. What is the decision?",
    explanation: "A goal cannot be scored directly into the kicker's own goal from a goal kick. If this happens, a corner kick is awarded.",
    answers: [
      { label: "No goal; corner kick awarded to the opposing team", isCorrect: true },
      { label: "Own goal is awarded", isCorrect: false },
      { label: "The goal kick is retaken", isCorrect: false },
      { label: "Dropped ball inside the goal area", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 16 ],
    text: "At a goal kick, an opponent enters the penalty area before the ball is in play. What happens?",
    explanation: "Opponents must be outside the penalty area until the ball is in play. If an opponent enters before and touches the ball, the goal kick is retaken. If they interfere without touching the ball, play continues.",
    answers: [
      { label: "Goal kick is retaken if the opponent touches or challenges for the ball; otherwise play continues", isCorrect: true },
      { label: "Indirect free kick to the defending team for the encroachment", isCorrect: false },
      { label: "The goal kick is always retaken regardless of whether the opponent touched the ball", isCorrect: false },
      { label: "Direct free kick to the defending team from the edge of the penalty area", isCorrect: false },
    ],
  },

  // ============================================
  // LAW 17 - THE CORNER KICK
  // ============================================
  {
    lawNumbers: [ 17 ],
    text: "A corner kick is taken and the ball goes directly into the opponents' goal. Is this a goal?",
    explanation: "A goal may be scored directly from a corner kick, but only against the opposing team.",
    answers: [
      { label: "Yes; a goal may be scored directly from a corner kick against the opposing team", isCorrect: true },
      { label: "No; at least one other player must touch the ball before a goal can be scored from a corner kick", isCorrect: false },
      { label: "No; goal kick awarded to the opposing team", isCorrect: false },
      { label: "The corner kick must be retaken", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 17 ],
    text: "A corner kick is taken and goes directly into the kicker's own goal. What is the decision?",
    explanation: "A goal cannot be scored directly into the kicker's own goal from a corner kick. If this happens, a corner kick is awarded to the opponents.",
    answers: [
      { label: "No goal; corner kick awarded to the opposing team", isCorrect: true },
      { label: "Own goal is awarded", isCorrect: false },
      { label: "Goal kick to the kicking team", isCorrect: false },
      { label: "The corner kick is retaken by the same team", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 17 ],
    text: "At a corner kick, a defending player stands less than 9.15m from the corner arc despite being asked to move. What should the referee do?",
    explanation: "Opponents must remain at least 9.15m from the corner arc until the ball is in play. If they refuse, the corner kick is still taken but the player may be cautioned for failing to respect the required distance.",
    answers: [
      { label: "Allow the corner kick to be taken; the player may be cautioned (yellow card) for failing to respect the required distance", isCorrect: true },
      { label: "Delay the corner kick until the player moves to the required distance", isCorrect: false },
      { label: "Sending-off (red card) the player for unsporting behaviour", isCorrect: false },
      { label: "Award an indirect free kick to the attacking team for the encroachment", isCorrect: false },
    ],
  },
  {
    lawNumbers: [ 17 ],
    text: "The corner flag is knocked over by the player taking the corner kick. What happens?",
    explanation: "The corner flagpost must be replaced before play continues. If a player deliberately removes the corner flag to take a kick, they must be cautioned.",
    answers: [
      { label: "The corner flagpost must be replaced before play continues; caution (yellow card) the player if it was deliberately removed", isCorrect: true },
      { label: "Continue play and replace the corner flag at the next stoppage", isCorrect: false },
      { label: "Indirect free kick to the defending team for removing the corner flag", isCorrect: false },
      { label: "Abandon the match if the corner flag cannot be replaced", isCorrect: false },
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
