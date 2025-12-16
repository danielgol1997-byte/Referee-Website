# IFAB Question Import - Quick Summary

## Files Created

1. **`IFAB_QUESTION_IMPORT_INSTRUCTIONS.md`**
   - Detailed step-by-step instructions for entering questions
   - Read this before entering each question
   - Contains examples and quality checklist

2. **`IFAB_IMPORT_RECOMMENDATIONS.md`**
   - Recommendations on the best approach for handling 554 questions
   - Explains automated vs manual options
   - Time estimates and workflow suggestions

3. **`prisma/clear-questions-and-tests.js`**
   - Script to delete all existing questions and tests
   - Run this BEFORE importing new questions
   - Includes safety confirmation prompt

## Quick Start

### Step 1: Clear Existing Data
```bash
node prisma/clear-questions-and-tests.js
```
⚠️ This will delete ALL questions and tests. Type "yes" to confirm.

### Step 2: Choose Your Approach

#### Option A: Automated Import (Recommended)
1. Provide all 554 questions in a text file
2. I'll create an import script
3. Review generated data
4. Run import script

#### Option B: Manual Entry
1. Read `IFAB_QUESTION_IMPORT_INSTRUCTIONS.md`
2. Enter questions one by one through the UI
3. Follow instructions carefully for each question

### Step 3: Verify
- Spot-check random questions
- Verify law numbers are correct
- Verify answer options make sense

## Key Rules

✅ **DO:**
- Copy question text exactly
- Copy explanation exactly
- Extract law numbers (whole numbers only)
- Create exactly 4 answer options
- Mark exactly one as correct

❌ **DON'T:**
- Modify question or explanation text
- Copy index numbers, "QUESTION", "ANSWER", "Hide answer"
- Copy law reference lines (e.g., "W Law 8/2")
- Create fewer/more than 4 options
- Mark multiple answers as correct

## Law Number Extraction

- "W Law 8/2" → **8**
- "Law 12/4" → **12**
- "Law 14/Introduction" → **14**
- Multiple laws: Select all (e.g., 8, 12, 14)

## Next Steps

1. **Decide on approach** (automated vs manual)
2. **Clear existing data** (run clear script)
3. **Provide questions** (if automated) OR **start manual entry** (if manual)
4. **Verify imported questions**

## Questions?

Refer to:
- `IFAB_QUESTION_IMPORT_INSTRUCTIONS.md` for detailed entry instructions
- `IFAB_IMPORT_RECOMMENDATIONS.md` for approach recommendations
