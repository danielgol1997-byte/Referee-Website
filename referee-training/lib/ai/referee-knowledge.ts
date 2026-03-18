/**
 * REFEREE KNOWLEDGE BASE
 *
 * This file is the authoritative reference for all AI prompts in the system.
 * It encodes IFAB Laws of the Game terminology, UEFA refereeing language,
 * and football/soccer general vocabulary.
 *
 * It is injected into both the admin description generation prompt and the
 * user query enhancement prompt via {{REFEREE_KNOWLEDGE}}.
 *
 * To update: edit this file. The AI will pick up changes on the next call
 * (the taxonomy cache has a 5-minute TTL; this file is static per deployment).
 * Future: this content can be seeded to a DB table for live editing.
 */

export const REFEREE_KNOWLEDGE = `
=== IFAB LAWS OF THE GAME - KEY TERMINOLOGY AND CONCEPTS ===

LAW 11 - OFFSIDE
Official definition: A player is in an offside position if any part of the head, body or feet is in the opponents' half and nearer to the opponents' goal line than both the ball and the second-to-last opponent.
Hands and arms are NOT used for offside calculation (arm up to shoulder only).

Three offside offences (must be in offside position AND interfere):
1. INTERFERING WITH PLAY – directly plays or touches the ball passed or touched by a team-mate.
2. INTERFERING WITH AN OPPONENT – prevents an opponent from playing or being able to play the ball by:
   • Clearly obstructing the goalkeeper's line of vision (blocking sight line, obscuring goalkeeper view)
   • Challenging an opponent for the ball
   • Clearly attempting to play a ball which is close when this action impacts on an opponent
   • Making an obvious action which clearly impacts on the ability of an opponent to play the ball
3. GAINING AN ADVANTAGE – plays the ball or interferes with an opponent when it has rebounded or been deflected off the goalpost, crossbar, match official, or an opponent.

Key offside terms: offside trap, delayed flag, VAR review, active involvement, passive offside, marginal offside, body part used for scoring, second phase offside.



LAW 12 - FOULS AND MISCONDUCT

Direct Free Kick offences (contact, careless/reckless/excessive force):
• Kicking or attempting to kick – straight leg, boot raised, studs showing
• Tripping or attempting to trip – block tackle, sliding tackle, leg hook
• Jumping at an opponent – two-footed jump, aerial challenge
• Charging – shoulder-to-shoulder charge, shoulder barge, obstruction
• Striking or attempting to strike – punch, elbow, headbutt
• Pushing – two hands, one hand, body
• Tackling / challenging – late tackle, mistimed tackle, slide tackle, two-footed tackle
• Holding – shirt pull, arm grab, preventing movement

Force levels (MUST match the tag):
• CARELESS – insufficient attention or consideration (no card needed; Yellow Card is discretionary for repeated or persistent fouling)
• RECKLESS – disregard for danger/consequences to opponent → Yellow Card mandatory
• EXCESSIVE FORCE / ENDANGERS SAFETY – complete disregard for the safety of the opponent → Red Card (Serious Foul Play if ball involved, Violent Conduct if not)
• SERIOUS FOUL PLAY (SFP) – uses excessive force or brutality in challenging for the ball. Studs up, two-footed, high foot into opponent, knee into groin.
• VIOLENT CONDUCT (VC) – strikes/spits/bites an opponent or any person when ball NOT in play or not challenging for ball

DOGSO - Denying an Obvious Goal-Scoring Opportunity (Red Card):
Must meet all four "D" criteria simultaneously:
1. DISTANCE to goal – close enough to score
2. DIRECTION of play – moving toward goal
3. DEFENDERS – no other defenders capable of intercepting (count all defenders on or behind the ball)
4. DEPRIVATION / BALL CONTROL – the offender takes the ball or takes the player (distance to ball matters)

Nuance: DOGSO WHILST ATTEMPTING TO PLAY THE BALL → Red Card + No suspension recommendation if purely playing ball (goalkeeper exception).
DOGSO WHILST NOT ATTEMPTING TO PLAY THE BALL → Red Card + suspension.
If the foul is INSIDE the penalty area and the player is ATTEMPTING TO PLAY THE BALL → Red Card only (no double jeopardy rule means penalty + send-off applies).

SPA - Stopping a Promising Attack (Yellow Card):
Not quite DOGSO. The attack was promising but not obviously goal-scoring.
Criteria: player was moving toward goal, had possession or clear path, but not all four DOGSO Ds were met.

HANDBALL (Law 12 - handballs):
Handball offence IF:
• Deliberate handball (intentional)
• Ball-to-arm/hand where the arm is in an UNNATURAL POSITION that makes the body UNNATURALLY BIGGER
• Arm above shoulder height (unless keeper inside own box)
• Ball is played/scored directly from: a deliberate handball, or a handball that immediately precedes a goal even by a different player

NOT a handball offence:
• Ball comes from player's own head/body/foot directly to their own arm/hand when arm is in natural position at side
• Goalkeeper handling inside their own penalty area
• Player's hand/arm is close to their body and does not make the body unnaturally bigger
• Brief/accidental contact at very close range (no time to withdraw arm)

Key handball terms: unnatural position, arm away from body, arm raised above shoulder, made bigger, accidental handball, deliberate handball, attacker handball before goal, deflection, ricochet.



ADVANTAGE
Referee may allow play to continue after a foul if the team fouled gains an immediate advantage.
Must signal clearly (arms forward, "Play on / Advantage").
If the anticipated advantage doesn't develop within a few seconds → bring back for the foul.
Advantage should NOT be applied when: the offence involves DOGSO (opponent must be punished), the offence is violent conduct, the player is seriously injured.

DISSENT (Yellow Card - Unsporting Behaviour / Misconduct):
• Verbal dissent – verbally challenges, disputes, or abuses referee's decision
• Physical dissent – aggressive approach toward referee, pointing, invading personal space
• Persistent dissent – repeatedly questioning decisions

SIMULATION / DIVING (Yellow Card - Unsporting Behaviour):
• Clear intention to deceive the referee by falling without contact or exaggerating minor contact
• Attempting to obtain an undeserved free kick or penalty
• Must be OBVIOUS – not every fall is simulation

REFEREE ABUSE / SERIOUS MISCONDUCT:
• Offensive, insulting, or abusive language → Red Card minimum
• Threatening behavior → Red Card
• Spitting toward an official → Red Card

PENALTY KICK SPECIFIC TERMINOLOGY:
• Encroachment – players entering the penalty area before the kick is taken
• Goalkeeper off line before kick – must have at least one foot on or behind the goal line
• Rebound – if keeper saves, attackers/defenders must be outside the arc until ball is kicked
• Penalty awarded – direct free kick offence committed by defender inside own penalty area
• Saves vs crosses – goalkeeper saving from open play vs set piece delivery

GOALKEEPER SPECIFIC:
• Deliberately handling the ball (outside penalty area) → Direct Free Kick
• Playing as outfield player (outside penalty area) → same rules as outfield
• Distribution restrictions (no second handling, six-second rule) → Indirect Free Kick


=== RESTART TYPES (OFFICIAL IFAB LANGUAGE) ===

DIRECT FREE KICK – awarded for direct free kick offences (physical contact fouls, deliberate handball). Goal can be scored directly.
INDIRECT FREE KICK – awarded for non-contact offences (offside, obstruction, goalkeeper violations, dangerous play). Goal cannot be scored directly; must touch another player first.
PENALTY KICK – direct free kick from penalty spot, all other players outside penalty area.
CORNER KICK – ball fully crosses goal line last touched by defender.
GOAL KICK – ball fully crosses goal line last touched by attacker.
THROW-IN – ball fully crosses touchline.
DROPPED BALL – referee stops play for injury, outside interference, or ball becomes defective.
KICK-OFF – start of match, second half, extra time, after a goal.


=== KEY IFAB LAW CROSS-REFERENCES ===

Law 12 governs: fouls, misconduct, cards, handball, DOGSO, SPA, simulation, advantage
Law 11 governs: offside position, active involvement, gaining advantage
Law 14 governs: penalty kick procedure, encroachment, goalkeeper requirements
Law 12+14 combined: handball in penalty area, DOGSO in penalty area (double jeopardy removal)
Law 5: Referee authority, advantage, added time, final decisions
Law 3: Player counts, substitutions, dismissal while ball in play


=== UEFA / PROFESSIONAL REFEREEING TERMINOLOGY ===

VAR (Video Assistant Referee):
• Clear and obvious error (COE) – the only standard that triggers a VAR review recommendation
• On-field review (OFR) – referee goes to pitchside monitor to review
• Reviewable incidents: goal/no-goal, penalty/no-penalty, straight red card, mistaken identity
• SILENT check – VAR checks but finds no clear error, does not inform referee
• VAR overturn – decision is reversed after review
• Protocol: VAR cannot check yellow cards, advantage decisions, trivial fouls

UEFA-specific terms:
• Match delegate – UEFA official observing the match
• Performance assessment – post-match referee grading
• Referee team: Referee (R), Assistant Referee 1 (AR1), AR2, Fourth Official (4O), VAR, AVAR
• Offside tool – technology used for offside marginal calls
• Body part used for scoring – phrase used in goal/no-goal VAR checks


=== FOOTBALL / SOCCER GENERAL TERMINOLOGY ===

Pitch positions and zones:
• Goalkeeper (GK), Center-back (CB), Full-back, Wing-back, Defensive Midfielder (DM/CDM), Central Midfielder (CM), Attacking Midfielder (AM/CAM), Winger, Striker, Center-forward, False nine
• Defensive third, middle third, attacking third
• Penalty area (18-yard box / the box), six-yard box, penalty spot, penalty arc
• Goal line, byline, touchline, halfway line, center circle
• Near post, far post, second post, six-yard box

Match phases and actions:
• Open play – general phase when no set piece situation
• Counter-attack (counter) – rapid attack after winning possession
• Set piece – corner, free kick, penalty, throw-in
• Through ball, cross, delivery, long ball, switch of play
• Press, high press, press-trap, block, intercept
• Dribble, feint, turn, first touch, control
• Header, aerial duel, 50-50 challenge
• Goalkeeper distribution: throw, kick, punt, roll, drop-kick

Contact situations:
• Shoulder-to-shoulder – legal physical contest
• Sliding tackle – defender goes to ground feet first
• Block tackle – standing challenge for the ball
• Two-footed tackle – both feet leave the ground simultaneously (typically excessive force)
• High foot / raised boot – foot above waist height near opponent
• Late tackle – contact made after the ball has been played
• Over-the-ball tackle – foot comes down on top of opponent's leg/foot
• Studs up – boot sole showing, toes raised, studs toward opponent (dangerous)
• Elbow – arm extended, strikes opponent with elbow (typically violent conduct)
• Headbutt – forehead or head intentionally strikes opponent (violent conduct)
• Arm/forearm check – using arm across body of opponent (often reckless/excessive)

Goalkeeper actions:
• Coming out / off line – goalkeeper advancing from goal line
• Dive / full stretch save – diving to stop a shot
• Claiming the cross – catching or punching a crossed ball
• Spilling the ball – dropping or fumbling a shot
• Distribution – goalkeeper passing or throwing the ball into play

Simulation-related:
• Diving, going down easily, exaggerating contact, play-acting, buying a foul, theatrics, buying a penalty


=== MULTILINGUAL NOTES ===

This library serves a multilingual audience. The AI should handle queries in any language — detect the language and translate/expand into English IFAB terminology for retrieval. The semantic search index is in English, so non-English queries must be translated to English for effective matching.
`.trim();
