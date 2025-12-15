"use client";

import { useState, useEffect } from "react";

// Organized to cycle through Laws 1-17 ten times
const lawSnippets = [
  // Round 1 - Basic overview of each law
  {
    law: "Law 1",
    title: "The Field of Play",
    snippet: "The field of play must be rectangular and marked with continuous lines which must not be dangerous.",
    url: "https://www.theifab.com/laws/latest/the-field-of-play/"
  },
  {
    law: "Law 2",
    title: "The Ball",
    snippet: "The ball is spherical and made of suitable material with a circumference of 68-70 cm and a weight of 410-450g.",
    url: "https://www.theifab.com/laws/latest/the-ball/"
  },
  {
    law: "Law 3",
    title: "The Players",
    snippet: "A match is played by two teams, each with a maximum of eleven players, one of whom is the goalkeeper.",
    url: "https://www.theifab.com/laws/latest/the-players/"
  },
  {
    law: "Law 4",
    title: "The Players' Equipment",
    snippet: "A player must not use equipment that is dangerous. All items of jewellery are forbidden and must be removed.",
    url: "https://www.theifab.com/laws/latest/the-players-equipment/"
  },
  {
    law: "Law 5",
    title: "The Referee",
    snippet: "Each match is controlled by a referee who has full authority to enforce the Laws of the Game.",
    url: "https://www.theifab.com/laws/latest/the-referee/"
  },
  {
    law: "Law 6",
    title: "The Other Match Officials",
    snippet: "Two assistant referees may be appointed whose duties are to indicate when the ball has left the field of play.",
    url: "https://www.theifab.com/laws/latest/the-other-match-officials/"
  },
  {
    law: "Law 7",
    title: "The Duration of the Match",
    snippet: "A match lasts for two equal halves of 45 minutes. Allowance is made for time lost.",
    url: "https://www.theifab.com/laws/latest/the-duration-of-the-match/"
  },
  {
    law: "Law 8",
    title: "The Start and Restart of Play",
    snippet: "A kick-off starts both halves of a match, both halves of extra time and restarts play after a goal has been scored.",
    url: "https://www.theifab.com/laws/latest/the-start-and-restart-of-play/"
  },
  {
    law: "Law 9",
    title: "The Ball In and Out of Play",
    snippet: "The ball is out of play when it has wholly passed over the goal line or touchline on the ground or in the air.",
    url: "https://www.theifab.com/laws/latest/the-ball-in-and-out-of-play/"
  },
  {
    law: "Law 10",
    title: "Determining the Outcome",
    snippet: "A goal is scored when the whole of the ball passes over the goal line, between the goalposts and under the crossbar.",
    url: "https://www.theifab.com/laws/latest/determining-the-outcome-of-a-match/"
  },
  {
    law: "Law 11",
    title: "Offside",
    snippet: "It is not an offence to be in an offside position. A player is only penalised for being offside if they are involved in active play.",
    url: "https://www.theifab.com/laws/latest/offside/"
  },
  {
    law: "Law 12",
    title: "Fouls and Misconduct",
    snippet: "A direct free kick is awarded if a player commits any offence which involves contact in a careless, reckless or excessive manner.",
    url: "https://www.theifab.com/laws/latest/fouls-and-misconduct/"
  },
  {
    law: "Law 13",
    title: "Free Kicks",
    snippet: "Free kicks are direct or indirect. A goal may be scored directly from a direct free kick against the opposing team.",
    url: "https://www.theifab.com/laws/latest/free-kicks/"
  },
  {
    law: "Law 14",
    title: "The Penalty Kick",
    snippet: "A penalty kick is awarded if a player commits an offence inside their penalty area that is punishable by a direct free kick.",
    url: "https://www.theifab.com/laws/latest/the-penalty-kick/"
  },
  {
    law: "Law 15",
    title: "The Throw-In",
    snippet: "A throw-in is awarded when the whole of the ball passes over the touchline, on the ground or in the air.",
    url: "https://www.theifab.com/laws/latest/the-throw-in/"
  },
  {
    law: "Law 16",
    title: "The Goal Kick",
    snippet: "A goal kick is awarded when the whole of the ball passes over the goal line, having last touched a player of the attacking team.",
    url: "https://www.theifab.com/laws/latest/the-goal-kick/"
  },
  {
    law: "Law 17",
    title: "The Corner Kick",
    snippet: "A corner kick is awarded when the whole of the ball passes over the goal line, having last touched a player of the defending team.",
    url: "https://www.theifab.com/laws/latest/the-corner-kick/"
  },

  // Round 2 - Specific details
  {
    law: "Law 1",
    title: "Field Dimensions",
    snippet: "Touchlines must be longer than goal lines. Length: 90-120m, Width: 45-90m. For international matches: Length 100-110m, Width 64-75m.",
    url: "https://www.theifab.com/laws/latest/the-field-of-play/"
  },
  {
    law: "Law 2",
    title: "Ball Pressure",
    snippet: "The ball must have a pressure equal to 0.6-1.1 atmosphere (600-1,100 g/cm²) at sea level.",
    url: "https://www.theifab.com/laws/latest/the-ball/"
  },
  {
    law: "Law 3",
    title: "Minimum Players",
    snippet: "A match may not start or continue if either team has fewer than seven players.",
    url: "https://www.theifab.com/laws/latest/the-players/"
  },
  {
    law: "Law 4",
    title: "Basic Equipment",
    snippet: "The basic compulsory equipment consists of: jersey, shorts, socks, shinguards, and footwear.",
    url: "https://www.theifab.com/laws/latest/the-players-equipment/"
  },
  {
    law: "Law 5",
    title: "Referee Authority",
    snippet: "The referee's authority begins when entering the field of play and continues until leaving the field after the final whistle.",
    url: "https://www.theifab.com/laws/latest/the-referee/"
  },
  {
    law: "Law 6",
    title: "Assistant Referee Duties",
    snippet: "Assistant referees indicate: offside, throw-ins, goal/corner kicks, fouls the referee cannot see, and any misconduct or incident the referee has not seen.",
    url: "https://www.theifab.com/laws/latest/the-other-match-officials/"
  },
  {
    law: "Law 7",
    title: "Half-time Interval",
    snippet: "Players are entitled to a half-time interval not exceeding 15 minutes. Competition rules must state the duration of the half-time interval.",
    url: "https://www.theifab.com/laws/latest/the-duration-of-the-match/"
  },
  {
    law: "Law 8",
    title: "Kick-off Procedure",
    snippet: "At kick-off, all players must be in their own half and opponents must be at least 9.15m from the ball until it is in play.",
    url: "https://www.theifab.com/laws/latest/the-start-and-restart-of-play/"
  },
  {
    law: "Law 9",
    title: "Ball in Play",
    snippet: "The ball is in play at all other times, including when it rebounds from a goalpost, crossbar, corner flagpost, or match official on the field.",
    url: "https://www.theifab.com/laws/latest/the-ball-in-and-out-of-play/"
  },
  {
    law: "Law 10",
    title: "Winning Team",
    snippet: "The team scoring the greater number of goals wins. If both teams score an equal number of goals, or no goals, the match is drawn.",
    url: "https://www.theifab.com/laws/latest/determining-the-outcome-of-a-match/"
  },
  {
    law: "Law 11",
    title: "Offside Position",
    snippet: "A player is in an offside position if any body part they can score with is nearer to the opponent's goal line than both the ball and the second-last opponent.",
    url: "https://www.theifab.com/laws/latest/offside/"
  },
  {
    law: "Law 12",
    title: "Direct Free Kick Offences",
    snippet: "Direct free kick offences include: charging, jumping at, kicking, pushing, striking, tackling, tripping, or attempting these actions against an opponent.",
    url: "https://www.theifab.com/laws/latest/fouls-and-misconduct/"
  },
  {
    law: "Law 13",
    title: "Indirect Free Kick",
    snippet: "A goal can only be scored from an indirect free kick if the ball subsequently touches another player before entering the goal.",
    url: "https://www.theifab.com/laws/latest/free-kicks/"
  },
  {
    law: "Law 14",
    title: "Penalty Procedure",
    snippet: "The ball is placed on the penalty mark. The goalkeeper remains on the goal line between the goalposts until the ball is kicked.",
    url: "https://www.theifab.com/laws/latest/the-penalty-kick/"
  },
  {
    law: "Law 15",
    title: "Throw-in Awarded To",
    snippet: "The throw-in is awarded to the opponents of the player who last touched the ball before it crossed the touchline.",
    url: "https://www.theifab.com/laws/latest/the-throw-in/"
  },
  {
    law: "Law 16",
    title: "Goal Kick Procedure",
    snippet: "The ball is kicked from any point within the goal area by a player of the defending team.",
    url: "https://www.theifab.com/laws/latest/the-goal-kick/"
  },
  {
    law: "Law 17",
    title: "Corner Kick Procedure",
    snippet: "The ball is placed in the corner area nearest to the point where the ball crossed the goal line.",
    url: "https://www.theifab.com/laws/latest/the-corner-kick/"
  },

  // Round 3 - More specific rules
  {
    law: "Law 1",
    title: "Goal Area",
    snippet: "The goal area is defined by two lines starting from the goal line, 5.5m from each goalpost, extending 5.5m into the field.",
    url: "https://www.theifab.com/laws/latest/the-field-of-play/"
  },
  {
    law: "Law 2",
    title: "Replacement Ball",
    snippet: "If the ball becomes defective during a match, play is stopped and restarted with a dropped ball where the original ball became defective.",
    url: "https://www.theifab.com/laws/latest/the-ball/"
  },
  {
    law: "Law 3",
    title: "Substitutions",
    snippet: "A maximum of five substitutes may be used in official competitions. Competition rules may allow additional substitutes in friendly matches.",
    url: "https://www.theifab.com/laws/latest/the-players/"
  },
  {
    law: "Law 4",
    title: "Shinguards",
    snippet: "Shinguards must be covered entirely by socks, made of suitable material, and provide reasonable protection.",
    url: "https://www.theifab.com/laws/latest/the-players-equipment/"
  },
  {
    law: "Law 5",
    title: "Referee Powers",
    snippet: "The referee takes disciplinary action, stops and suspends play for injuries or other reasons, and takes action against team officials who fail to act responsibly.",
    url: "https://www.theifab.com/laws/latest/the-referee/"
  },
  {
    law: "Law 6",
    title: "Fourth Official",
    snippet: "The fourth official assists with administrative duties, substitution procedures, checking equipment, and displaying added time information.",
    url: "https://www.theifab.com/laws/latest/the-other-match-officials/"
  },
  {
    law: "Law 7",
    title: "Allowance for Time Lost",
    snippet: "Time is allowed for substitutions, injuries, removal of injured players, time-wasting, disciplinary actions, stoppages for VAR, drinks breaks, or other causes.",
    url: "https://www.theifab.com/laws/latest/the-duration-of-the-match/"
  },
  {
    law: "Law 8",
    title: "Ball in Play from Kick-off",
    snippet: "The ball is in play when it is kicked and clearly moves. A goal may be scored directly from the kick-off against the opponent.",
    url: "https://www.theifab.com/laws/latest/the-start-and-restart-of-play/"
  },
  {
    law: "Law 9",
    title: "Wholly Crossed",
    snippet: "The ball must completely cross the line - if any part of the ball is on or above the line, it is still in play.",
    url: "https://www.theifab.com/laws/latest/the-ball-in-and-out-of-play/"
  },
  {
    law: "Law 10",
    title: "Competition Tiebreakers",
    snippet: "Competition rules may provide for extra time or kicks from the penalty mark (penalty shoot-out) to determine the winner of a drawn match.",
    url: "https://www.theifab.com/laws/latest/determining-the-outcome-of-a-match/"
  },
  {
    law: "Law 11",
    title: "Not Offside",
    snippet: "A player is not in an offside position if they are in their own half, level with the second-last opponent, or level with the last two opponents.",
    url: "https://www.theifab.com/laws/latest/offside/"
  },
  {
    law: "Law 12",
    title: "Handling the Ball",
    snippet: "A handball occurs when a player deliberately touches the ball with their hand/arm, or when the hand/arm has made their body unnaturally bigger.",
    url: "https://www.theifab.com/laws/latest/fouls-and-misconduct/"
  },
  {
    law: "Law 13",
    title: "Referee Signal",
    snippet: "The referee indicates an indirect free kick by raising an arm above their head until the kick is taken and the ball touches another player or goes out of play.",
    url: "https://www.theifab.com/laws/latest/free-kicks/"
  },
  {
    law: "Law 14",
    title: "Player Positions",
    snippet: "All players except the kicker and goalkeeper must be: in the field of play, outside the penalty area, behind the penalty mark, at least 9.15m from the penalty mark.",
    url: "https://www.theifab.com/laws/latest/the-penalty-kick/"
  },
  {
    law: "Law 15",
    title: "Throw-in Procedure",
    snippet: "At the moment of delivering the ball, the thrower must: face the field, have part of each foot on the touchline or ground outside, throw with both hands from behind and over the head.",
    url: "https://www.theifab.com/laws/latest/the-throw-in/"
  },
  {
    law: "Law 16",
    title: "Opponents Position",
    snippet: "Opponents must remain outside the penalty area until the ball is in play (has left the penalty area).",
    url: "https://www.theifab.com/laws/latest/the-goal-kick/"
  },
  {
    law: "Law 17",
    title: "Corner Flagpost",
    snippet: "The corner flagpost must not be moved. The ball must be placed inside the corner arc.",
    url: "https://www.theifab.com/laws/latest/the-corner-kick/"
  },

  // Round 4 - Advanced details
  {
    law: "Law 1",
    title: "Penalty Area",
    snippet: "The penalty area is marked by lines 16.5m from each goalpost and 16.5m into the field, connected by a line parallel to the goal line.",
    url: "https://www.theifab.com/laws/latest/the-field-of-play/"
  },
  {
    law: "Law 2",
    title: "Ball Approval",
    snippet: "All balls used in official competitions must bear one of the FIFA Quality marks indicating they have met official standards.",
    url: "https://www.theifab.com/laws/latest/the-ball/"
  },
  {
    law: "Law 3",
    title: "Substitution Procedure",
    snippet: "The substitute only enters after the player being replaced has left and after receiving a signal from the referee.",
    url: "https://www.theifab.com/laws/latest/the-players/"
  },
  {
    law: "Law 4",
    title: "Goalkeeper Distinction",
    snippet: "Each goalkeeper wears colours that distinguish them from other players and the match officials.",
    url: "https://www.theifab.com/laws/latest/the-players-equipment/"
  },
  {
    law: "Law 5",
    title: "Advantage",
    snippet: "The referee allows play to continue when an offence occurs if the non-offending team benefits from continuing. The referee may still caution/send off.",
    url: "https://www.theifab.com/laws/latest/the-referee/"
  },
  {
    law: "Law 6",
    title: "VAR Protocol",
    snippet: "The video assistant referee (VAR) assists the referee by reviewing footage to check decisions in clear and obvious errors or serious missed incidents.",
    url: "https://www.theifab.com/laws/latest/the-other-match-officials/"
  },
  {
    law: "Law 7",
    title: "Penalty Kick",
    snippet: "If a penalty kick has to be taken or retaken, time is extended until the penalty kick is completed.",
    url: "https://www.theifab.com/laws/latest/the-duration-of-the-match/"
  },
  {
    law: "Law 8",
    title: "Dropped Ball",
    snippet: "A dropped ball is the restart when the referee stops play and the Laws do not specify a different restart.",
    url: "https://www.theifab.com/laws/latest/the-start-and-restart-of-play/"
  },
  {
    law: "Law 9",
    title: "Ground or Air",
    snippet: "The ball can be out of play whether on the ground or in the air - the vertical plane of the line extends upward.",
    url: "https://www.theifab.com/laws/latest/the-ball-in-and-out-of-play/"
  },
  {
    law: "Law 10",
    title: "Penalty Shoot-out Procedure",
    snippet: "Each team takes five kicks alternately. If still tied, kicks continue until one team has scored more goals from the same number of kicks.",
    url: "https://www.theifab.com/laws/latest/determining-the-outcome-of-a-match/"
  },
  {
    law: "Law 11",
    title: "Active Play",
    snippet: "A player is involved in active play if they: interfere with play, interfere with an opponent, or gain an advantage from being in that position.",
    url: "https://www.theifab.com/laws/latest/offside/"
  },
  {
    law: "Law 12",
    title: "Careless, Reckless, Excessive",
    snippet: "Careless = lack of attention. Reckless = disregard for danger (yellow card). Excessive force = far exceeds necessary force, endangers safety (red card).",
    url: "https://www.theifab.com/laws/latest/fouls-and-misconduct/"
  },
  {
    law: "Law 13",
    title: "Opponent Distance",
    snippet: "All opponents must be at least 9.15m from the ball until it is in play, unless they are on their own goal line between the goalposts.",
    url: "https://www.theifab.com/laws/latest/free-kicks/"
  },
  {
    law: "Law 14",
    title: "Goalkeeper Movement",
    snippet: "The goalkeeper must not move off the goal line until the ball is kicked. However, they may move along the line before the kick.",
    url: "https://www.theifab.com/laws/latest/the-penalty-kick/"
  },
  {
    law: "Law 15",
    title: "No Goal from Throw-in",
    snippet: "A goal cannot be scored directly from a throw-in. If the ball goes into the opponent's goal, a goal kick is awarded. Into own goal = corner kick.",
    url: "https://www.theifab.com/laws/latest/the-throw-in/"
  },
  {
    law: "Law 16",
    title: "Ball in Play",
    snippet: "The ball is in play when it is kicked and clearly moves. It must leave the penalty area before anyone can touch it.",
    url: "https://www.theifab.com/laws/latest/the-goal-kick/"
  },
  {
    law: "Law 17",
    title: "Opponent Distance",
    snippet: "Opponents must remain at least 9.15m from the corner arc until the ball is in play.",
    url: "https://www.theifab.com/laws/latest/the-corner-kick/"
  },

  // Round 5 - Continuing details
  {
    law: "Law 1",
    title: "Corner Arc",
    snippet: "A quarter circle with a radius of 1m from each corner flagpost is drawn inside the field of play for corner kicks.",
    url: "https://www.theifab.com/laws/latest/the-field-of-play/"
  },
  {
    law: "Law 2",
    title: "Additional Balls",
    snippet: "Additional balls may be placed around the field of play provided they meet requirements and their use is controlled by the referee.",
    url: "https://www.theifab.com/laws/latest/the-ball/"
  },
  {
    law: "Law 3",
    title: "Goalkeeper Change",
    snippet: "Any player may change places with the goalkeeper provided the referee is informed beforehand and the change is made during a stoppage.",
    url: "https://www.theifab.com/laws/latest/the-players/"
  },
  {
    law: "Law 4",
    title: "Jewellery Ban",
    snippet: "All items of jewellery (including religious or cultural objects) are strictly forbidden and must be removed. Taping is not permitted.",
    url: "https://www.theifab.com/laws/latest/the-players-equipment/"
  },
  {
    law: "Law 5",
    title: "Referee Decisions",
    snippet: "The referee's decisions on facts connected with play are final, including whether a goal was scored and the result of the match.",
    url: "https://www.theifab.com/laws/latest/the-referee/"
  },
  {
    law: "Law 6",
    title: "Reviewable Incidents",
    snippet: "VAR can review: goals, penalty decisions, direct red card incidents, and mistaken identity. These are the only reviewable game-changing situations.",
    url: "https://www.theifab.com/laws/latest/the-other-match-officials/"
  },
  {
    law: "Law 7",
    title: "Drinks Break",
    snippet: "Drinks breaks (maximum one minute) are permitted in each half. Competition rules must state when drinks breaks are allowed.",
    url: "https://www.theifab.com/laws/latest/the-duration-of-the-match/"
  },
  {
    law: "Law 8",
    title: "Dropped Ball Procedure",
    snippet: "The ball is dropped for the defending team goalkeeper in their penalty area or for one player of the team that last touched the ball at the location of the last touch.",
    url: "https://www.theifab.com/laws/latest/the-start-and-restart-of-play/"
  },
  {
    law: "Law 9",
    title: "Play Not Stopped",
    snippet: "Play continues if the ball rebounds from the referee, assistant referee, or any match official positioned on the field.",
    url: "https://www.theifab.com/laws/latest/the-ball-in-and-out-of-play/"
  },
  {
    law: "Law 10",
    title: "Eligible Kickers",
    snippet: "Only players on the field at the end of the match (including those temporarily off) are eligible to take kicks from the penalty mark.",
    url: "https://www.theifab.com/laws/latest/determining-the-outcome-of-a-match/"
  },
  {
    law: "Law 11",
    title: "Interfering with Play",
    snippet: "Interfering with play includes playing or touching the ball passed or touched by a team-mate.",
    url: "https://www.theifab.com/laws/latest/offside/"
  },
  {
    law: "Law 12",
    title: "Indirect Free Kick Offences",
    snippet: "Indirect free kick offences include: dangerous play, impeding an opponent's progress, preventing the goalkeeper from releasing the ball, or goalkeeper offences.",
    url: "https://www.theifab.com/laws/latest/fouls-and-misconduct/"
  },
  {
    law: "Law 13",
    title: "Ball in Play",
    snippet: "The ball is in play when it is kicked and clearly moves. The ball can be kicked in any direction.",
    url: "https://www.theifab.com/laws/latest/free-kicks/"
  },
  {
    law: "Law 14",
    title: "Kicker Identified",
    snippet: "The player taking the penalty must be clearly identified. The kicker cannot be changed except for injury after the referee has signaled for the kick.",
    url: "https://www.theifab.com/laws/latest/the-penalty-kick/"
  },
  {
    law: "Law 15",
    title: "Opponent Distance",
    snippet: "All opponents must stand at least 2m from the point on the touchline where the throw-in is to be taken.",
    url: "https://www.theifab.com/laws/latest/the-throw-in/"
  },
  {
    law: "Law 16",
    title: "Goal from Goal Kick",
    snippet: "A goal may be scored directly from a goal kick, but only against the opposing team. If it goes into the kicker's own goal, a corner kick is awarded to the opponents.",
    url: "https://www.theifab.com/laws/latest/the-goal-kick/"
  },
  {
    law: "Law 17",
    title: "Ball in Play",
    snippet: "The ball is in play when it is kicked and clearly moves. The ball does not need to leave the corner area.",
    url: "https://www.theifab.com/laws/latest/the-corner-kick/"
  },

  // Round 6
  {
    law: "Law 1",
    title: "Goals",
    snippet: "Goals must be placed on the centre of each goal line. They consist of two vertical posts 7.32m apart connected by a horizontal crossbar 2.44m from the ground.",
    url: "https://www.theifab.com/laws/latest/the-field-of-play/"
  },
  {
    law: "Law 2",
    title: "Ball Interference",
    snippet: "If an extra ball enters the field during play and interferes, the referee stops play and restarts with a dropped ball.",
    url: "https://www.theifab.com/laws/latest/the-ball/"
  },
  {
    law: "Law 3",
    title: "Team Officials",
    snippet: "Team officials include the coach, assistant coach, fitness coach, doctor, and other persons with responsibilities. Only one official may give tactical instructions.",
    url: "https://www.theifab.com/laws/latest/the-players/"
  },
  {
    law: "Law 4",
    title: "Non-dangerous Equipment",
    snippet: "Non-dangerous protective equipment (e.g., headgear, facemasks, knee/arm protectors) made of soft material is permitted.",
    url: "https://www.theifab.com/laws/latest/the-players-equipment/"
  },
  {
    law: "Law 5",
    title: "Change of Decision",
    snippet: "The referee may only change a decision on realising it is incorrect, or on advice from another match official, provided play has not restarted or the match has not ended.",
    url: "https://www.theifab.com/laws/latest/the-referee/"
  },
  {
    law: "Law 6",
    title: "On-field Review",
    snippet: "The referee may review the footage personally at the review area (RRA) for subjective decisions before making the final decision.",
    url: "https://www.theifab.com/laws/latest/the-other-match-officials/"
  },
  {
    law: "Law 7",
    title: "Cooling Break",
    snippet: "Cooling breaks (90 seconds to 3 minutes) may be allowed in competitions with high temperatures/humidity. The referee controls the duration.",
    url: "https://www.theifab.com/laws/latest/the-duration-of-the-match/"
  },
  {
    law: "Law 8",
    title: "Ball Touches Official",
    snippet: "If the ball touches a match official and goes into the goal, changes possession, or starts a promising attack, a dropped ball is awarded.",
    url: "https://www.theifab.com/laws/latest/the-start-and-restart-of-play/"
  },
  {
    law: "Law 9",
    title: "Stoppage Whistle",
    snippet: "The referee stops play with a whistle. Play may continue if the referee does not whistle for an infringement.",
    url: "https://www.theifab.com/laws/latest/the-ball-in-and-out-of-play/"
  },
  {
    law: "Law 10",
    title: "Goal Not Scored",
    snippet: "A goal is not scored if the referee stops play before the ball has crossed the line or if an offence was committed before or during the scoring.",
    url: "https://www.theifab.com/laws/latest/determining-the-outcome-of-a-match/"
  },
  {
    law: "Law 11",
    title: "Interfering with Opponent",
    snippet: "Interfering with an opponent includes preventing them from playing or being able to play the ball by clearly obstructing their line of vision or challenging for the ball.",
    url: "https://www.theifab.com/laws/latest/offside/"
  },
  {
    law: "Law 12",
    title: "Yellow Card Offences",
    snippet: "Yellow card (caution) offences include: unsporting behaviour, dissent, persistent offences, delaying restart, failure to respect distance, entering/leaving without permission.",
    url: "https://www.theifab.com/laws/latest/fouls-and-misconduct/"
  },
  {
    law: "Law 13",
    title: "Free Kick in Penalty Area",
    snippet: "A free kick to the defending team in their penalty area may be taken from anywhere in the goal area. Opponents must be outside the penalty area until the ball is in play.",
    url: "https://www.theifab.com/laws/latest/free-kicks/"
  },
  {
    law: "Law 14",
    title: "Feinting",
    snippet: "Feinting to kick the ball once the kicker has completed their run-up is an offence (yellow card). Feinting during the run-up is permitted.",
    url: "https://www.theifab.com/laws/latest/the-penalty-kick/"
  },
  {
    law: "Law 15",
    title: "Throw-in Infringement",
    snippet: "If the throw-in is taken incorrectly, it is retaken by the opposing team. If the ball does not enter the field, the same team retakes it.",
    url: "https://www.theifab.com/laws/latest/the-throw-in/"
  },
  {
    law: "Law 16",
    title: "Quick Goal Kick",
    snippet: "A goal kick can be taken quickly if an opponent is still in the penalty area, but if they interfere with play, the kick is retaken.",
    url: "https://www.theifab.com/laws/latest/the-goal-kick/"
  },
  {
    law: "Law 17",
    title: "Goal from Corner",
    snippet: "A goal may be scored directly from a corner kick, but only against the opposing team.",
    url: "https://www.theifab.com/laws/latest/the-corner-kick/"
  },

  // Round 7
  {
    law: "Law 1",
    title: "Technical Area",
    snippet: "The technical area extends 1m on either side of the designated seating area and up to 1m from the touchline.",
    url: "https://www.theifab.com/laws/latest/the-field-of-play/"
  },
  {
    law: "Law 2",
    title: "Ball Material",
    snippet: "The ball must be made of leather or other suitable material approved for use in the match.",
    url: "https://www.theifab.com/laws/latest/the-ball/"
  },
  {
    law: "Law 3",
    title: "Outside Agents",
    snippet: "If an outside agent enters the field and interferes with play, the referee stops the match and restarts with a dropped ball.",
    url: "https://www.theifab.com/laws/latest/the-players/"
  },
  {
    law: "Law 4",
    title: "Electronic Devices",
    snippet: "Players must not wear or use any form of electronic or communication equipment (except EPTS as per Law 3).",
    url: "https://www.theifab.com/laws/latest/the-players-equipment/"
  },
  {
    law: "Law 5",
    title: "Injury Assessment",
    snippet: "The referee allows an injured player to be quickly assessed/treated if there is bleeding, or if there has been head contact, or on the referee's decision.",
    url: "https://www.theifab.com/laws/latest/the-referee/"
  },
  {
    law: "Law 6",
    title: "Additional ARs",
    snippet: "Additional assistant referees may be appointed to operate along each goal line to help with decisions in the penalty area.",
    url: "https://www.theifab.com/laws/latest/the-other-match-officials/"
  },
  {
    law: "Law 7",
    title: "Abandoned Match",
    snippet: "If the match is abandoned, competition rules determine whether it is replayed or the result stands.",
    url: "https://www.theifab.com/laws/latest/the-duration-of-the-match/"
  },
  {
    law: "Law 8",
    title: "Choosing Ends",
    snippet: "A coin is tossed and the team that wins chooses which goal to attack in the first half. The other team takes the kick-off.",
    url: "https://www.theifab.com/laws/latest/the-start-and-restart-of-play/"
  },
  {
    law: "Law 9",
    title: "Goal Line Technology",
    snippet: "When GLT signals the ball has crossed the goal line between the posts and under the crossbar, the referee receives a signal on their watch.",
    url: "https://www.theifab.com/laws/latest/the-ball-in-and-out-of-play/"
  },
  {
    law: "Law 10",
    title: "Goalkeeper Eligibility",
    snippet: "A goalkeeper who is injured or sent off during kicks from the penalty mark may be replaced by a substitute if the team has not used its full substitution allocation.",
    url: "https://www.theifab.com/laws/latest/determining-the-outcome-of-a-match/"
  },
  {
    law: "Law 11",
    title: "Gaining Advantage",
    snippet: "Gaining an advantage includes playing a ball that rebounds or is deflected from the goalpost, crossbar, match official, or an opponent, or was deliberately saved by an opponent.",
    url: "https://www.theifab.com/laws/latest/offside/"
  },
  {
    law: "Law 12",
    title: "Red Card Offences",
    snippet: "Red card (sending-off) offences include: serious foul play, violent conduct, spitting, DOGSO (denying obvious goal-scoring opportunity), offensive language/gestures.",
    url: "https://www.theifab.com/laws/latest/fouls-and-misconduct/"
  },
  {
    law: "Law 13",
    title: "Quick Free Kick",
    snippet: "The attacking team may take a quick free kick with opponents less than 9.15m away. The referee cannot prevent this unless requesting to caution/send off a player.",
    url: "https://www.theifab.com/laws/latest/free-kicks/"
  },
  {
    law: "Law 14",
    title: "Goalkeeper Offence",
    snippet: "If the goalkeeper commits an offence and the ball misses or is saved, the kick is retaken and the goalkeeper is cautioned.",
    url: "https://www.theifab.com/laws/latest/the-penalty-kick/"
  },
  {
    law: "Law 15",
    title: "Double Touch",
    snippet: "If the thrower touches the ball again before it touches another player, an indirect free kick is awarded to the opponent.",
    url: "https://www.theifab.com/laws/latest/the-throw-in/"
  },
  {
    law: "Law 16",
    title: "Double Touch",
    snippet: "If the kicker touches the ball again before it touches another player, an indirect free kick is awarded to the opponent.",
    url: "https://www.theifab.com/laws/latest/the-goal-kick/"
  },
  {
    law: "Law 17",
    title: "Own Goal from Corner",
    snippet: "If the ball goes directly into the kicker's own goal from a corner kick, a corner kick is awarded to the opponents.",
    url: "https://www.theifab.com/laws/latest/the-corner-kick/"
  },

  // Round 8
  {
    law: "Law 1",
    title: "Field Surface",
    snippet: "The surface must be entirely natural or artificial (where competition rules permit). Artificial surfaces must be green.",
    url: "https://www.theifab.com/laws/latest/the-field-of-play/"
  },
  {
    law: "Law 2",
    title: "Ball Testing",
    snippet: "Before the match, the referee checks that all balls used meet the requirements and determines which ball will be used.",
    url: "https://www.theifab.com/laws/latest/the-ball/"
  },
  {
    law: "Law 3",
    title: "Sent Off Before Kick-off",
    snippet: "A player sent off before kick-off may only be replaced by a named substitute. The team cannot name a new substitute.",
    url: "https://www.theifab.com/laws/latest/the-players/"
  },
  {
    law: "Law 4",
    title: "Colours Clash",
    snippet: "The two teams must wear colours that distinguish them from each other and the match officials. Each goalkeeper must wear different colours.",
    url: "https://www.theifab.com/laws/latest/the-players-equipment/"
  },
  {
    law: "Law 5",
    title: "Referee Signals",
    snippet: "The referee acts on the advice of assistant referees and other match officials regarding incidents they have not personally seen.",
    url: "https://www.theifab.com/laws/latest/the-referee/"
  },
  {
    law: "Law 6",
    title: "Reserve AR",
    snippet: "A reserve assistant referee may be appointed to replace an assistant referee or fourth official if they are unable to continue.",
    url: "https://www.theifab.com/laws/latest/the-other-match-officials/"
  },
  {
    law: "Law 7",
    title: "Duration Changes",
    snippet: "Competition rules may allow matches of shorter duration (e.g., for youth or small-sided football) but must not exceed 45 minutes per half for players over 16.",
    url: "https://www.theifab.com/laws/latest/the-duration-of-the-match/"
  },
  {
    law: "Law 8",
    title: "Kick-off Violation",
    snippet: "If the player taking the kick-off touches the ball again before it has touched another player, an indirect free kick is awarded.",
    url: "https://www.theifab.com/laws/latest/the-start-and-restart-of-play/"
  },
  {
    law: "Law 9",
    title: "Ball Burst",
    snippet: "If the ball bursts or becomes defective during play, play is stopped and restarted with a dropped ball.",
    url: "https://www.theifab.com/laws/latest/the-ball-in-and-out-of-play/"
  },
  {
    law: "Law 10",
    title: "Away Goals",
    snippet: "Competition rules may use the away goals rule, but this is being phased out in many competitions.",
    url: "https://www.theifab.com/laws/latest/determining-the-outcome-of-a-match/"
  },
  {
    law: "Law 11",
    title: "Deliberate Save",
    snippet: "A 'save' is when a player stops, or attempts to stop, a ball which is going into or very close to the goal with any part of the body except the hands/arms.",
    url: "https://www.theifab.com/laws/latest/offside/"
  },
  {
    law: "Law 12",
    title: "DOGSO by Handling",
    snippet: "DOGSO in the penalty area by deliberately handling the ball is a red card. DOGSO in the penalty area by an attempted tackle is only a yellow if playing or attempting to play the ball.",
    url: "https://www.theifab.com/laws/latest/fouls-and-misconduct/"
  },
  {
    law: "Law 13",
    title: "Encroachment",
    snippet: "If an opponent is closer than 9.15m when the free kick is taken and interferes with play, the free kick is retaken unless advantage applies.",
    url: "https://www.theifab.com/laws/latest/free-kicks/"
  },
  {
    law: "Law 14",
    title: "Encroachment Outcome",
    snippet: "If encroachment occurs and a goal is scored, the kick is retaken unless the offence was by the defending team. If missed/saved, retake only if it affected the outcome.",
    url: "https://www.theifab.com/laws/latest/the-penalty-kick/"
  },
  {
    law: "Law 15",
    title: "No Offside",
    snippet: "A player cannot be offside directly from a throw-in.",
    url: "https://www.theifab.com/laws/latest/the-throw-in/"
  },
  {
    law: "Law 16",
    title: "No Offside",
    snippet: "A player cannot be offside directly from a goal kick.",
    url: "https://www.theifab.com/laws/latest/the-goal-kick/"
  },
  {
    law: "Law 17",
    title: "Double Touch",
    snippet: "If the kicker touches the ball again before it touches another player, an indirect free kick is awarded to the opponent.",
    url: "https://www.theifab.com/laws/latest/the-corner-kick/"
  },

  // Round 9
  {
    law: "Law 1",
    title: "Centre Circle",
    snippet: "A circle with a radius of 9.15m is marked around the centre mark. Opponents must be outside this circle until the ball is in play at kick-off.",
    url: "https://www.theifab.com/laws/latest/the-field-of-play/"
  },
  {
    law: "Law 2",
    title: "Ball Ownership",
    snippet: "The referee is not required to stop the match if the ball touches them and remains in the field of play.",
    url: "https://www.theifab.com/laws/latest/the-ball/"
  },
  {
    law: "Law 3",
    title: "Return to Field",
    snippet: "A substituted or sent-off player must leave the field by the nearest point on the touchline/goal line unless the referee indicates otherwise.",
    url: "https://www.theifab.com/laws/latest/the-players/"
  },
  {
    law: "Law 4",
    title: "Undershirts",
    snippet: "If undershirts are worn, the sleeves must be the same main colour as the jersey sleeves or be a pattern/colour matching the jersey.",
    url: "https://www.theifab.com/laws/latest/the-players-equipment/"
  },
  {
    law: "Law 5",
    title: "Referee Equipment",
    snippet: "The referee must have a whistle, a watch, red and yellow cards, and may have other equipment to assist (e.g., vanishing spray, communication system).",
    url: "https://www.theifab.com/laws/latest/the-referee/"
  },
  {
    law: "Law 6",
    title: "VAR Intervention",
    snippet: "The VAR can only intervene for clear and obvious errors or serious missed incidents. Minor or debatable decisions are not reviewed.",
    url: "https://www.theifab.com/laws/latest/the-other-match-officials/"
  },
  {
    law: "Law 7",
    title: "Extra Time",
    snippet: "Competition rules may provide for extra time of two equal periods not exceeding 15 minutes each in knockout competitions.",
    url: "https://www.theifab.com/laws/latest/the-duration-of-the-match/"
  },
  {
    law: "Law 8",
    title: "Second Half",
    snippet: "At the start of the second half, teams change ends and the team that did not take the kick-off in the first half takes it.",
    url: "https://www.theifab.com/laws/latest/the-start-and-restart-of-play/"
  },
  {
    law: "Law 9",
    title: "Interference",
    snippet: "If an object (not the ball) enters the field and interferes with play, the referee stops play and restarts with a dropped ball unless the ball has gone out of play.",
    url: "https://www.theifab.com/laws/latest/the-ball-in-and-out-of-play/"
  },
  {
    law: "Law 10",
    title: "Sudden Death Kicks",
    snippet: "After teams have taken five kicks each in a shoot-out, if still tied, kicks continue in sudden death - first team to score wins.",
    url: "https://www.theifab.com/laws/latest/determining-the-outcome-of-a-match/"
  },
  {
    law: "Law 11",
    title: "No Offside Offence",
    snippet: "There is no offside offence if a player receives the ball directly from a goal kick, throw-in, or corner kick.",
    url: "https://www.theifab.com/laws/latest/offside/"
  },
  {
    law: "Law 12",
    title: "Team Officials",
    snippet: "Team officials may be shown yellow or red cards. If the offender cannot be identified, the senior coach in the technical area receives the card.",
    url: "https://www.theifab.com/laws/latest/fouls-and-misconduct/"
  },
  {
    law: "Law 13",
    title: "Double Touch",
    snippet: "If the kicker touches the ball again before it has touched another player, an indirect free kick is awarded to the opponent.",
    url: "https://www.theifab.com/laws/latest/free-kicks/"
  },
  {
    law: "Law 14",
    title: "Rebound",
    snippet: "The kicker must not play the ball again until it has touched another player. If they do, an indirect free kick is awarded to the opponent.",
    url: "https://www.theifab.com/laws/latest/the-penalty-kick/"
  },
  {
    law: "Law 15",
    title: "Throw-in Point",
    snippet: "The throw-in is taken from the point where the ball crossed the touchline, not from where the infringement that caused it to go out occurred.",
    url: "https://www.theifab.com/laws/latest/the-throw-in/"
  },
  {
    law: "Law 16",
    title: "Ball Not Leaving Area",
    snippet: "If the ball is not kicked directly out of the penalty area, or if it is touched before leaving, the kick is retaken.",
    url: "https://www.theifab.com/laws/latest/the-goal-kick/"
  },
  {
    law: "Law 17",
    title: "No Offside",
    snippet: "A player cannot be offside directly from a corner kick.",
    url: "https://www.theifab.com/laws/latest/the-corner-kick/"
  },

  // Round 10
  {
    law: "Law 1",
    title: "Field Markings",
    snippet: "All lines must be of the same width, not more than 12cm. The goal line must be the same width as the goalposts and crossbar.",
    url: "https://www.theifab.com/laws/latest/the-field-of-play/"
  },
  {
    law: "Law 2",
    title: "Ball Standards",
    snippet: "Competition rules may require that all balls used bear the FIFA Quality Pro, FIFA Quality or IMS - International Match Standard logo.",
    url: "https://www.theifab.com/laws/latest/the-ball/"
  },
  {
    law: "Law 3",
    title: "Extra Persons",
    snippet: "If an extra person is on the field when a goal is scored, the referee must disallow the goal if the extra person interfered with play.",
    url: "https://www.theifab.com/laws/latest/the-players/"
  },
  {
    law: "Law 4",
    title: "Equipment Violation",
    snippet: "If a player's equipment doesn't comply with Law 4, they must leave at the next stoppage. They may only return when the referee has checked the equipment.",
    url: "https://www.theifab.com/laws/latest/the-players-equipment/"
  },
  {
    law: "Law 5",
    title: "Referee Unable to Continue",
    snippet: "If the referee is unable to continue, play continues until the ball is out of play. The senior assistant referee or fourth official takes over unless the match is abandoned.",
    url: "https://www.theifab.com/laws/latest/the-referee/"
  },
  {
    law: "Law 6",
    title: "Final Decision",
    snippet: "The referee makes the final decision, even after a VAR review. The referee can reject the VAR's advice if desired.",
    url: "https://www.theifab.com/laws/latest/the-other-match-officials/"
  },
  {
    law: "Law 7",
    title: "Referee's Timepiece",
    snippet: "The referee's watch is the official timepiece for the match. The minimum additional time is announced but not the maximum.",
    url: "https://www.theifab.com/laws/latest/the-duration-of-the-match/"
  },
  {
    law: "Law 8",
    title: "Dropped Ball Contact",
    snippet: "If a dropped ball enters the goal without touching at least two players, play is restarted with a goal kick or corner kick.",
    url: "https://www.theifab.com/laws/latest/the-start-and-restart-of-play/"
  },
  {
    law: "Law 9",
    title: "Ball Still In",
    snippet: "As long as part of the ball remains on or above the line (even if most of it is beyond), play continues.",
    url: "https://www.theifab.com/laws/latest/the-ball-in-and-out-of-play/"
  },
  {
    law: "Law 10",
    title: "Reduced Numbers",
    snippet: "If during kicks from the penalty mark a team has fewer players than the opponent, the team with more players reduces to equalize. The excluded players cannot kick.",
    url: "https://www.theifab.com/laws/latest/determining-the-outcome-of-a-match/"
  },
  {
    law: "Law 11",
    title: "Offside Restart",
    snippet: "For an offside offence, an indirect free kick is awarded from the position where the offence occurred, even if it is in the player's own half.",
    url: "https://www.theifab.com/laws/latest/offside/"
  },
  {
    law: "Law 12",
    title: "Advantage and Cards",
    snippet: "If the referee plays advantage for an offence for which a caution/sending-off would have been issued, this must be issued when the ball is next out of play.",
    url: "https://www.theifab.com/laws/latest/fouls-and-misconduct/"
  },
  {
    law: "Law 13",
    title: "Ceremonial Free Kick",
    snippet: "If the referee signals for a 'ceremonial' free kick (waiting for wall distance or disciplinary action), the kick cannot be taken until the referee whistles.",
    url: "https://www.theifab.com/laws/latest/free-kicks/"
  },
  {
    law: "Law 14",
    title: "Penalty Extended Time",
    snippet: "If a penalty has to be taken or retaken, time is extended at the end of each half until the kick is completed.",
    url: "https://www.theifab.com/laws/latest/the-penalty-kick/"
  },
  {
    law: "Law 15",
    title: "Quick Throw-in",
    snippet: "A throw-in can be taken quickly with the same ball that went out of play. If a different ball is used, the referee must authorize it.",
    url: "https://www.theifab.com/laws/latest/the-throw-in/"
  },
  {
    law: "Law 16",
    title: "Goalkeeper Distribution",
    snippet: "After a goal kick, the goalkeeper may receive a pass back from a teammate within the penalty area without restriction.",
    url: "https://www.theifab.com/laws/latest/the-goal-kick/"
  },
  {
    law: "Law 17",
    title: "Quick Corner",
    snippet: "A corner kick can be taken quickly without waiting for opponents to be 9.15m away, unless the referee has indicated otherwise.",
    url: "https://www.theifab.com/laws/latest/the-corner-kick/"
  }
];

export function LawSnippetsCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % lawSnippets.length);
        setIsAnimating(false);
      }, 500);
    }, 6000);

    return () => clearInterval(interval);
  }, [isPaused]);

  const goToNext = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % lawSnippets.length);
      setIsAnimating(false);
    }, 300);
  };

  const goToPrev = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + lawSnippets.length) % lawSnippets.length);
      setIsAnimating(false);
    }, 300);
  };

  const currentSnippet = lawSnippets[currentIndex];

  return (
    <div className="relative">
      {/* Animated background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-accent/5 animate-pulse" 
           style={{ animationDuration: '4s' }} />
      
      {/* Liquid glass card */}
      <div 
        className="relative backdrop-blur-xl bg-dark-700/40 border border-accent/20 rounded-xl shadow-lg p-6 
                    hover:border-accent/30 transition-all duration-500
                    hover:shadow-[0_0_30px_rgba(232,224,154,0.15)]"
        onMouseEnter={() => {
          setIsPaused(true);
          setIsHovered(true);
        }}
        onMouseLeave={() => {
          setIsPaused(false);
          setIsHovered(false);
        }}
      >
        {/* Shimmer effect overlay */}
        <div className="absolute inset-0 rounded-xl overflow-hidden">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_8s_ease-in-out_infinite] 
                          bg-gradient-to-r from-transparent via-white/3 to-transparent" />
        </div>

        {/* Content */}
        <div className={`relative transition-all duration-500 ${isAnimating ? 'opacity-0 -translate-x-8' : 'opacity-100 translate-x-0'}`}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <a 
                href={currentSnippet.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 rounded-lg bg-accent/10 border border-accent/30 
                          hover:bg-accent/20 hover:border-accent/50 hover:scale-105
                          transition-all duration-200 group"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-xs font-bold text-accent tracking-wider group-hover:text-accent-dark">
                  {currentSnippet.law}
                </span>
              </a>
              <h3 className="text-lg font-semibold text-white">
                {currentSnippet.title}
              </h3>
            </div>
          </div>
          
          <p className="text-text-secondary leading-relaxed mb-4">
            {currentSnippet.snippet}
          </p>

          {/* Navigation Controls - Hidden by default, shown on hover */}
          <div 
            className={`flex items-center justify-between transition-all duration-300 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="flex items-center gap-2">
              <button
                onClick={goToPrev}
                className="p-2 rounded-lg bg-dark-600/50 hover:bg-dark-600 text-accent/70 hover:text-accent transition-all duration-200"
                aria-label="Previous snippet"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={goToNext}
                className="p-2 rounded-lg bg-dark-600/50 hover:bg-dark-600 text-accent/70 hover:text-accent transition-all duration-200"
                aria-label="Next snippet"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom accent line with animation */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-accent/50 to-transparent 
                        opacity-50" />
      </div>
    </div>
  );
}
