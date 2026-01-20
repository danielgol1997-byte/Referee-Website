# Category as Criteria Groups - System Documentation

## Summary of Changes

The system has been simplified so that **CATEGORY tags ARE the criteria groups**. There are no separate "criteria group" entities.

## How It Works

### 1. CATEGORY Tags
- CATEGORY tags (Challenges, Handball, Offside, DOGSO, SPA, etc.) **are** the criteria groups
- They appear in video filters and can be selected to tag videos
- They can be mapped to RAP categories (A, B, C, D, L)
- They do NOT show up separately as "groups" on the user end - they're just tags

### 2. CRITERIA Tags
- CRITERIA tags belong to a parent CATEGORY tag via the `parentCategory` field
- Example: "Careless" has `parentCategory: "Challenges"`
- When a CATEGORY is mapped to a RAP, all its CRITERIA children automatically get the same RAP mapping
- CRITERIA tags appear in the Criteria dropdown when their parent category is selected

### 3. RAP Category Mapping
- Map CATEGORY tags to RAP assessment areas (Decision Making, Management, etc.)
- This automatically cascades to all child CRITERIA tags
- Videos with these tags show up in the correct RAP category filter

### 4. Video Tagging with Filtered Criteria ✨
- **When tagging videos**: Select CATEGORY tags first (e.g., "Offside", "Handball")
- **CRITERIA dropdown automatically filters**: Only shows criteria belonging to selected categories
- Example: Select "Offside" → Criteria dropdown shows only offside-related criteria
- Multiple categories selected → Criteria shows ALL criteria from those categories

## User Interface

### Super Admin - Tags Page
- **Categories Section**: Shows all CATEGORY tags
  - Help text: "Category tags are also criteria groups. Criteria tags belong to categories."
- **Criteria Section**: Shows all CRITERIA tags grouped by their parent category
  - When creating a CRITERIA tag, you select which CATEGORY it belongs to

###  Super Admin - RAP Mapping Page
- Select RAP category for each CATEGORY tag
- Auto-saves on selection (no save button needed)
- Overview cards show:
  - Which CATEGORY tags are mapped to each RAP
  - How many CRITERIA tags are under that RAP (auto-counted)

### Super Admin - Video Upload
- **Category Dropdown**: Select CATEGORY tags (e.g., "Handball", "Offside")
- **Criteria Dropdown**: **Dynamically filters** to show only criteria where `parentCategory` matches selected categories
- **No selected categories?** All criteria shown
- **Selected "Offside"?** Only offside criteria shown
- **Selected "Offside" + "Handball"?** Both offside and handball criteria shown

### Video Library - Filtering
- **Category Dropdown**: Select a CATEGORY tag (e.g., "Handball")
- **Criteria Dropdown**: Becomes enabled, shows only CRITERIA tags where `parentCategory` matches selected category
- **RAP Category Filter**: Shows videos that:
  - Have the VideoCategory with matching RAP code, OR
  - Have ANY tag with matching RAP category

## Database Structure

```prisma
model Tag {
  id             String      @id @default(cuid())
  name           String      @unique
  slug           String      @unique
  category       TagCategory @default(CATEGORY)
  parentCategory String?     // For CRITERIA: which CATEGORY this belongs to
  rapCategory    String?     // RAP code (A, B, C, D, L)
  // ... other fields
}
```

## Benefits

1. **Simpler**: No separate "criteria group" entity to maintain
2. **Flexible**: Any CATEGORY tag can have or not have CRITERIA children
3. **Automatic**: RAP mapping cascades from CATEGORY to CRITERIA automatically
4. **Intuitive**: Categories are groups - it makes logical sense
5. **No Hidden Logic**: Everything is visible in the admin interface
6. **Smart Filtering**: Criteria dropdown filters based on selected categories in video upload

## Example Workflow

1. Create CATEGORY tag "Handball"
2. Create CRITERIA tags with `parentCategory: "Handball"`:
   - "Hand/Arm Moves Towards The Ball"
   - "Player Tries To Avoid Hand Contact"
   - etc.
3. Map "Handball" to RAP "A - Decision Making"
   - All Handball criteria automatically get `rapCategory: 'A'`
4. Upload a video:
   - Select "Handball" category tag
   - Criteria dropdown now shows ONLY handball-related criteria
   - Select relevant handball criteria
5. Video appears when filtering by:
   - Category: Handball
   - RAP: Decision Making

## Implementation Details

### Video Upload Form Filtering Logic

```typescript
// For CRITERIA tags, filter based on selected CATEGORY tags
if (category === 'CRITERIA') {
  const selectedCategoryNames = [...correctDecisionTags, ...invisibleTags]
    .filter(t => t.category === 'CATEGORY')
    .map(t => t.name);
  
  // Only show criteria that belong to selected categories
  if (selectedCategoryNames.length > 0) {
    filteredOptions = filteredOptions.filter(tag => 
      tag.parentCategory && selectedCategoryNames.includes(tag.parentCategory)
    );
  }
}
```

This ensures that:
- If no CATEGORY tags selected → Show all criteria
- If "Offside" selected → Show only criteria with `parentCategory: "Offside"`
- If "Offside" + "Handball" selected → Show criteria from both categories

## Testing Checklist

- [x] Can create CATEGORY tags
- [x] Can create CRITERIA tags with parent category
- [x] RAP mapping auto-saves
- [x] RAP mapping cascades to criteria
- [x] Filter bar shows/hides on hover
- [x] Criteria dropdown disabled until category selected (library page)
- [x] Criteria dropdown shows filtered options (library page)
- [x] Videos filter correctly by RAP category
- [x] Video counts accurate in RAP tabs
- [x] Overview cards show correct criteria counts
- [x] Video upload: Criteria filters based on selected categories
- [x] Video upload: Multiple categories show combined criteria
- [x] Video upload: No categories shows all criteria
