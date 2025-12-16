# Recommendations for Importing 554 IFAB Questions

## Best Approach: Automated Script with Manual Review

### Recommended Method: Create a Bulk Import Script

**Why this is best:**
1. **Efficiency**: Processing 554 questions manually through the UI would take many hours
2. **Consistency**: Automated parsing ensures consistent extraction of question text, explanations, and law numbers
3. **Accuracy**: Script can parse law references more reliably than manual extraction
4. **Error Reduction**: Automated extraction reduces human error in copying/pasting
5. **Review Process**: You can review the generated data before importing

### Implementation Approach

#### Option 1: Node.js Script (Recommended)
Create a script that:
1. Reads all 554 questions from a text file (you provide the full content)
2. Parses each question block using regex/string matching
3. Extracts:
   - Question text (between `QUESTION` and `ANSWER`)
   - Explanation (after "Hide answer", before law references)
   - Law numbers (from "W Law X/Y" patterns)
4. Generates 4 answer options (1 correct based on explanation, 3 plausible incorrect)
5. Outputs JSON file with all questions ready for import
6. You review the JSON file
7. Script imports via API calls to `/api/admin/questions`

**Advantages:**
- Fast (processes all 554 in seconds)
- Consistent parsing
- Reviewable before import
- Can be re-run if errors found

#### Option 2: Semi-Automated with CSV
1. Script parses questions and generates a CSV file
2. You review and edit the CSV (especially answer options)
3. Script imports from CSV

**Advantages:**
- Easy to review/edit in Excel/Google Sheets
- Can manually adjust answer options
- Still faster than full manual entry

#### Option 3: Manual Entry (Not Recommended)
- Enter each question through the QuestionForm UI
- Would take approximately 10-15 minutes per question
- **Total time: 90-140 hours** (not practical)

---

## Recommended Workflow

### Step 1: Prepare Data File
- Save all 554 questions in a single text file
- Format should match your example (with `---INDEX: X---`, `QUESTION`, `ANSWER`, etc.)

### Step 2: Create Import Script
I can create a Node.js script that:
- Parses the text file
- Extracts questions, explanations, and law numbers
- Generates answer options (you may need to review/edit these)
- Creates JSON ready for import

### Step 3: Review Generated Data
- Review the extracted questions and explanations
- Review generated answer options (most important - these need to be realistic)
- Edit as needed

### Step 4: Import via Script
- Script makes API calls to create all questions
- Can include progress tracking and error handling

### Step 5: Verification
- Spot-check random questions in the UI
- Verify law numbers are correct
- Verify answer options make sense

---

## Answer Option Generation Strategy

**Challenge**: The script needs to generate 3 plausible incorrect answers for each question.

**Approach**:
1. **Correct Answer**: Extract from explanation (what decision/action is stated)
2. **Incorrect Answers**: Generate based on common alternatives:
   - Opposite decision (allow vs disallow, etc.)
   - Different restart method (direct free kick vs indirect free kick vs penalty)
   - Different disciplinary action (no card vs yellow vs red)
   - Different law application

**Note**: You may want to manually review/edit answer options, especially for complex scenarios.

---

## Which Agent to Use?

**For this task, I recommend:**
- **Composer (me)** - Best for:
  - Creating the parsing script
  - Generating the import script
  - Handling the bulk import
  - Fixing any parsing issues

**Why not other agents:**
- This requires understanding the codebase structure
- Needs to create scripts that interact with your API
- Requires careful parsing logic
- Needs error handling and validation

---

## Next Steps

1. **Provide the full 554 questions** in a text file (or paste here in chunks)
2. **I'll create the import script** that:
   - Parses all questions
   - Extracts required fields
   - Generates answer options
   - Creates import-ready JSON
3. **You review the generated data** (especially answer options)
4. **Run the import script** to bulk import all questions
5. **Verify** a sample of imported questions

---

## Alternative: Hybrid Approach

If you prefer more control over answer options:

1. Script extracts: Question, Explanation, Law Numbers
2. Script creates a CSV/JSON with these fields + placeholder for 4 answer options
3. You fill in answer options manually (in spreadsheet or JSON editor)
4. Script imports from completed file

This gives you:
- Speed for extraction
- Control over answer quality
- Still much faster than full manual entry

---

## Questions to Consider

1. **Answer Options**: Do you want me to generate them automatically, or would you prefer to create them manually?
2. **Data Format**: How are the 554 questions currently stored? (Text file? PDF? Word doc?)
3. **Review Process**: Do you want to review all questions before import, or trust the automated extraction?
4. **Batch Size**: Import all at once, or in batches (e.g., 50 at a time)?

---

## Recommendation Summary

✅ **Best Approach**: Automated script that:
- Parses all 554 questions from text file
- Extracts question, explanation, law numbers automatically
- Generates answer options (with your review)
- Imports via API calls
- Includes progress tracking and error handling

⏱️ **Time Estimate**: 
- Script creation: 1-2 hours
- Data review: 2-4 hours (depending on answer option quality)
- Import execution: 5-10 minutes
- Verification: 30 minutes

**Total: ~4-7 hours** vs **90-140 hours** for manual entry

---

## Ready to Proceed?

Please provide:
1. The text file with all 554 questions, OR
2. Confirmation that you'll paste them here in manageable chunks

Then I'll create the import script for you!
