# IFAB Question Import Instructions

## CRITICAL: Read these instructions before entering each question

### Overview
You are entering IFAB (International Football Association Board) questions into the referee training system. Each question must be entered exactly as provided, with no modifications to the question text or answer explanation.

---

## Step-by-Step Process for Each Question

### 1. Extract the Question Text
- **DO**: Copy the question text exactly as it appears between `QUESTION` and `ANSWER`
- **DO NOT**: Copy the word "QUESTION" or the index number (e.g., "INDEX: 1")
- **DO NOT**: Modify, rephrase, or change any part of the question text

### 2. Extract the Answer/Explanation
- **DO**: Copy the explanation text exactly as it appears after "Hide answer"
- **DO NOT**: Copy the word "ANSWER" or "Hide answer"
- **DO NOT**: Copy any law references at the bottom (e.g., "W Law 8/2", "Law 12/4", etc.)
- **DO NOT**: Copy the text "LAW DETAILS" or any text that appears after law references
- **DO NOT**: Modify, rephrase, or change any part of the explanation

### 3. Extract Law Numbers
- Look for law references at the end of the answer (e.g., "W Law 8/2", "Law 12/4", "Law 14/Introduction")
- Extract ONLY the whole number before the slash or decimal
  - Example: "W Law 8/2" → Law number: **8**
  - Example: "Law 12/4" → Law number: **12**
  - Example: "Law 14/Introduction" → Law number: **14**
- If multiple law numbers are referenced, add ALL of them (a question can reference multiple laws)
- Example: "W Law 8/2. Dropped ball, Law 12/4. Disciplinary action, Law 14/Introduction" → Law numbers: **8, 12, 14**

### 4. Create Answer Options
- You must create **exactly 4 answer options**
- **One option** must be the correct answer, based strictly on the explanation provided
- **Three options** must be plausible but incorrect alternatives
- The correct answer should directly reflect what the explanation states
- Make sure all 4 options are realistic and related to the question

### 5. Form Fields Mapping

#### Question Text Field
- Paste the extracted question text (from Step 1)
- This goes into the "Question text" textarea

#### Explanation Field
- Paste the extracted explanation (from Step 2)
- This goes into the "Explanation" textarea (the one with placeholder "Provide an explanation for the correct answer...")

#### Law Numbers Field
- Select all relevant law numbers (from Step 3) using the law dropdown
- A question can have multiple laws selected

#### Answer Options
- Enter 4 answer options
- Mark exactly ONE as correct (using the radio button)
- The correct answer must align with the explanation

---

## Example Processing

### Input Format:
```
---
INDEX: 1
---
QUESTION
Team A plays a pass along the ground into the opponents'
penalty area. An attacker from Team A, who is in an offside
position and close to a defender from Team B, clearly
moves towards the ball and then allows it to go through
their legs. The attacker's movement affects the defender
who is unsure what will happen to the ball; the ball goes to
another Team A player who scores. What is the correct
decision?
ANSWER
Hide answer
If the attacker's action clearly impacted the ability of the
defender to play the ball, this is considered interfering with
an opponent' and therefore an offside offence, even if the
attacker did not play the ball. The referee must disallow the
goal and award an indirect free kick to the defending team.
```

### What to Extract:

**Question Text:**
```
Team A plays a pass along the ground into the opponents'
penalty area. An attacker from Team A, who is in an offside
position and close to a defender from Team B, clearly
moves towards the ball and then allows it to go through
their legs. The attacker's movement affects the defender
who is unsure what will happen to the ball; the ball goes to
another Team A player who scores. What is the correct
decision?
```

**Explanation:**
```
If the attacker's action clearly impacted the ability of the
defender to play the ball, this is considered interfering with
an opponent' and therefore an offside offence, even if the
attacker did not play the ball. The referee must disallow the
goal and award an indirect free kick to the defending team.
```

**Law Numbers:** (No law references in this example, so none selected)

**Answer Options (example):**
1. ✅ **Disallow the goal and award an indirect free kick to Team B** (CORRECT - based on explanation)
2. Allow the goal to stand
3. Disallow the goal and award a direct free kick to Team B
4. Award a penalty kick to Team A

---

## Important Rules

### ❌ NEVER DO:
- Change the question text in any way
- Change the explanation text in any way
- Copy index numbers, "QUESTION", "ANSWER", "Hide answer"
- Copy law reference lines (e.g., "W Law 8/2")
- Copy "LAW DETAILS" text
- Create fewer or more than 4 answer options
- Mark more than one answer as correct

### ✅ ALWAYS DO:
- Copy question and explanation exactly as provided
- Extract law numbers correctly (whole numbers only, ignore decimals/slashes)
- Create exactly 4 answer options
- Mark exactly one answer as correct
- Base the correct answer strictly on the explanation provided

---

## Quality Checklist

Before submitting each question, verify:
- [ ] Question text is copied exactly (no modifications)
- [ ] Explanation is copied exactly (no modifications)
- [ ] No index numbers, "QUESTION", "ANSWER", "Hide answer" included
- [ ] No law reference lines included in explanation
- [ ] Law numbers are correctly extracted and selected
- [ ] Exactly 4 answer options are provided
- [ ] Exactly one answer is marked as correct
- [ ] The correct answer aligns with the explanation

---

## Notes

- Questions are entered one at a time through the QuestionForm interface
- The system automatically saves questions to the database
- All questions should be assigned to the "Laws of the Game" category (this is automatic)
- Difficulty level defaults to 1 (can be adjusted later if needed)
- Questions are set to active by default

---

## Troubleshooting

**Q: What if there are no law references?**
A: Leave the law numbers field empty (no laws selected).

**Q: What if the law reference has decimals like "Law 8.2"?**
A: Extract only the whole number: **8** (ignore the decimal part).

**Q: What if multiple laws are referenced?**
A: Select all of them. For example, if you see "Law 8/2, Law 12/4", select both Law 8 and Law 12.

**Q: What if the explanation doesn't clearly state the answer?**
A: Read the explanation carefully - it should contain the correct decision. Base your correct answer option on what the explanation concludes.

**Q: Can I modify the question or explanation to make it clearer?**
A: **NO. NEVER.** Copy exactly as provided. The integrity of IFAB questions must be preserved.
