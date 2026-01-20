# Criteria Groups Auto-Generated from Category Tags

## What This Does

The **collapsible groups in the Criteria section** are now **auto-generated from CATEGORY tags**. This creates a live, dynamic link between the two sections.

## How It Works

### 1. Create a Category Tag
- Create a new CATEGORY tag called "Test Category"
- **Instantly**: A new group "TEST CATEGORY (0 criteria)" appears in Criteria section
- The group uses the category's name and color

### 2. Edit a Category Tag
- Edit "Offside" → Change name to "Offside Offences"
- **Instantly**: The group header in Criteria updates to "OFFSIDE OFFENCES"
- Edit the category's color → Group color updates immediately

### 3. Delete a Category Tag
- Delete the "Offside" CATEGORY tag
- **Instantly**: The "Offside" group disappears from Criteria
- All criteria with `parentCategory: "Offside"` become orphaned (go to "No Category" group)

### 4. Create Criteria Under a Category
- Create CRITERIA tag with `parentCategory: "Handball"`
- **Instantly**: It appears under the "HANDBALL" group
- The count updates: "HANDBALL (12 criteria)" → "HANDBALL (13 criteria)"

## Visual Flow

```
📂 Category Section
   └─ [Offside] [Edit] [Delete]
          ↓
          ↓ (auto-synced)
          ↓
📂 Criteria Section
   └─ 📂 OFFSIDE (18 criteria)  ← Group name from category
         ├─ [Offside] [Edit]    ← The category tag itself
         ├─ Active involvement
         ├─ Ball Deliberately...
         └─ ... (18 criteria)
```

## Example Scenarios

### Scenario 1: Renaming a Category
**Action**: Edit "Offside" → Change to "Offside Decisions"

**Result**:
- Category section: Shows "Offside Decisions"
- Criteria section: Group header updates to "OFFSIDE DECISIONS"
- All 18 criteria still grouped under it
- Video library filter: Updates to "Offside Decisions"

### Scenario 2: Creating a New Category
**Action**: Create CATEGORY tag "VAR Decisions"

**Result**:
- Category section: Shows "VAR Decisions"
- Criteria section: New group "VAR DECISIONS (0 criteria)" appears
- Message inside: "No criteria yet. Create criteria with parentCategory: 'VAR Decisions'"
- Ready to add criteria to it

### Scenario 3: Deleting a Category
**Action**: Delete "Simulation" CATEGORY tag

**Result**:
- Category section: "Simulation" removed
- Criteria section: "SIMULATION" group disappears
- 3 simulation criteria move to "No Category" group
- Those criteria lose their `parentCategory` field

### Scenario 4: Empty Categories
**Action**: Create "New Category" but don't add any criteria yet

**Result**:
- Shows "NEW CATEGORY (0 criteria)" in Criteria section
- When expanded: "No criteria yet. Create criteria with parentCategory: 'New Category'"
- Still useful for organization - shows you have the category ready

## Benefits

1. ✅ **Single source of truth**: Category names managed in one place
2. ✅ **Instant updates**: Edit category → group updates immediately
3. ✅ **No orphaned groups**: Delete category → group disappears cleanly
4. ✅ **Clear relationship**: Can see category AND its criteria together
5. ✅ **Better UX**: No manual group management needed
6. ✅ **Scalable**: Add 100 categories → 100 groups appear automatically

## Implementation Details

### Key Changes in `TagManager.tsx`

```typescript
// Initialize with ALL category tags (even if they have 0 criteria)
categoryTags.forEach(cat => {
  criteriaByCategory[cat.name] = [];
});

// Then populate with actual criteria
if (groupedTags.CRITERIA) {
  groupedTags.CRITERIA.forEach(tag => {
    if (tag.parentCategory && criteriaByCategory[tag.parentCategory]) {
      criteriaByCategory[tag.parentCategory].push(tag);
    } else {
      generalCriteria.push(tag);
    }
  });
}

// Map for quick lookup
const categoryTagsMap: Record<string, Tag> = {};
categoryTags.forEach(cat => {
  categoryTagsMap[cat.name] = cat;
});

// Render using actual category tag data
const categoryTag = categoryTagsMap[categoryName];
<h5>{categoryTag.name}</h5>  // Uses live category name
<div style={{ backgroundColor: categoryTag.color }} />  // Uses live color
```

## User Interface Updates

### Criteria Section Header
```
Criteria (45)
Groups auto-generated from Category tags
```
Small subtitle to explain the auto-generation.

### Empty Group Message
```
No criteria yet. Create criteria with parentCategory: "Test Category"
```
Helpful message showing how to populate the group.

### Group Header
```
[■] OFFSIDE (18 criteria)  [▼]
```
- Color square from category
- Name from category (uppercase)
- Live count of criteria
- Expand/collapse arrow

## Related Documentation
- `CATEGORY_AS_CRITERIA_GROUPS.md` - Full system explanation
- `TAGMANAGER_CATEGORY_DISPLAY.md` - Previous iteration (now superseded)

## Testing Checklist
- [x] Build compiles successfully
- [x] Empty categories show (0 criteria)
- [x] Edit category name → group name updates
- [x] Edit category color → group color updates
- [x] Delete category → group disappears
- [x] Create category → group appears
- [x] Orphaned criteria go to "No Category"
- [x] Group counts are accurate
