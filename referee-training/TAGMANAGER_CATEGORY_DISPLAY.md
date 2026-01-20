# TagManager UI Update - Categories as Criteria Groups

## What Changed

Updated the **Tags** page in Super Admin to clearly show that **CATEGORY tags ARE criteria groups**.

## Before
- Categories section: Shows all CATEGORY tags
- Criteria section: Shows criteria grouped by category name (just text headers)
- Not obvious that the category name refers to an actual CATEGORY tag

## After
- Categories section: Shows all CATEGORY tags (unchanged)
- Criteria section: Shows collapsible groups where:
  - **Each group header** shows the category name + criteria count
  - **Inside each group**: Shows the actual CATEGORY tag as an editable/deletable item
  - **Below the category tag**: Shows all CRITERIA tags that belong to it
  - Makes it crystal clear that categories ARE the groups

## Visual Structure

```
📂 Criteria (Collapsible)
  
  📂 Offside (19 criteria) [Collapsible]
     ┌─────────────────────────────────┐
     │ CATEGORY TAG:                   │
     │ [Offside] [Edit] [Delete]      │ ← The actual CATEGORY tag
     ├─────────────────────────────────┤
     │ CRITERIA TAGS (18):             │
     │ [Active involvement in play]    │
     │ [Ball Deliberately Saved...]    │
     │ [Challenging Opponent...]       │
     │ ...                             │
     └─────────────────────────────────┘
  
  📂 Handball (12 criteria) [Collapsible]
     ┌─────────────────────────────────┐
     │ CATEGORY TAG:                   │
     │ [Handball] [Edit] [Delete]     │ ← The actual CATEGORY tag
     ├─────────────────────────────────┤
     │ CRITERIA TAGS (11):             │
     │ [Hand/Arm Makes Body Bigger]    │
     │ [Hand/Arm Above Shoulder...]    │
     │ ...                             │
     └─────────────────────────────────┘
```

## Benefits

1. ✅ **Clear relationship**: Can see the CATEGORY tag and its CRITERIA together
2. ✅ **Easy editing**: Can edit/delete the CATEGORY tag right from the Criteria section
3. ✅ **No confusion**: Obvious that "Offside" category IS the "Offside" CATEGORY tag
4. ✅ **Better UX**: Don't need to switch between sections to manage related tags
5. ✅ **Visual hierarchy**: Category at top, criteria below - clear parent-child relationship

## Implementation Details

### Updated Components
- `components/admin/library/TagManager.tsx`

### Key Changes
```typescript
// Find the actual CATEGORY tag object
const categoryTag = categoryTags.find(cat => cat.name === categoryName);

// Render it inside the collapsible group
{categoryTag && (
  <div className="mb-3 pb-3 border-b border-dark-600/30">
    <div className="text-xs text-text-muted mb-2 uppercase tracking-wider">
      Category Tag:
    </div>
    {renderTagItem(categoryTag)}
  </div>
)}

// Then show criteria
<div className="text-xs text-text-muted mb-2 uppercase tracking-wider">
  Criteria Tags ({criteriaTags.length}):
</div>
{criteriaTags.map(renderTagItem)}
```

## User Experience

### Workflow
1. Go to Super Admin → Library → Tags
2. Expand "Criteria" section
3. See collapsible groups for each category (Offside, Handball, etc.)
4. Click to expand a group
5. See:
   - The CATEGORY tag itself (with Edit/Delete buttons)
   - All CRITERIA tags that belong to it
6. Can edit either the category or its criteria right there

### Example: Managing Offside Tags
1. Expand "Criteria"
2. Expand "Offside (19 criteria)"
3. See "Offside" CATEGORY tag at top
4. See 18 offside criteria below
5. Can edit "Offside" color/description
6. Can edit any offside criterion
7. Can delete criteria individually
8. Can even delete the Offside category (if no criteria depend on it)

## Related Documentation
- `CATEGORY_AS_CRITERIA_GROUPS.md` - Full system explanation
- `OFFSIDE_TAGS_CLEANUP.md` - Recent cleanup of duplicate tags

## Testing Done
- [x] Build compiles successfully
- [x] TypeScript types correct
- [x] Category tags display in Criteria groups
- [x] Edit/Delete buttons work
- [x] Collapsible behavior works
- [x] "No Category" section still works for orphaned criteria
