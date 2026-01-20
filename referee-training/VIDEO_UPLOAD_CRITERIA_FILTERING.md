# Video Upload Criteria Filtering - Implementation

## What Was Implemented

When tagging videos in the Super Admin upload form, the CRITERIA dropdown now **intelligently filters** based on which CATEGORY tags have been selected.

## How It Works

### Before This Change
- CRITERIA dropdown showed ALL criteria tags regardless of context
- Hard to find relevant criteria when you have many tags
- No connection between category selection and available criteria

### After This Change
- Select a CATEGORY tag (e.g., "Offside") → CRITERIA dropdown shows ONLY offside-related criteria
- Select multiple categories → CRITERIA shows combined criteria from all selected categories
- No categories selected → Shows all criteria (default behavior)

## Technical Implementation

### Updated Files

1. **`components/admin/library/VideoUploadForm.tsx`**
   - Added `parentCategory?: string` to `Tag` interface
   - Added filtering logic in the tag dropdown rendering section
   - Filters criteria based on their `parentCategory` field matching selected CATEGORY tag names

### Code Logic

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

## User Experience

### Example Workflow

1. **Upload a video** in Super Admin
2. **Select category tags**:
   - Click "Category" dropdown
   - Select "Offside"
   - Select "Handball"
3. **Select criteria**:
   - Click "Criteria" dropdown
   - Now see ONLY criteria that belong to Offside OR Handball
   - Example criteria shown:
     - "Active Involvement" (parentCategory: "Offside")
     - "Hand/Arm Makes Body Bigger" (parentCategory: "Handball")
4. **Tag video appropriately**
   - Relevant criteria are easy to find
   - No clutter from unrelated criteria

### Visual Flow

```
Category Dropdown (14 categories)
   ↓ Select "Offside"
   ↓
Criteria Dropdown (filters to ~8 offside criteria)
   ↓ Select relevant criteria
   ↓
Video Tagged with:
   - Category: Offside
   - Criteria: Active Involvement, Interfering with Play
```

## Benefits

1. **✅ Faster Tagging**: Less scrolling, easier to find relevant criteria
2. **✅ Fewer Mistakes**: Can't accidentally select handball criteria for an offside video
3. **✅ Better Organization**: Clear relationship between categories and their criteria
4. **✅ Scalable**: Works with any number of categories and criteria
5. **✅ Flexible**: Multiple categories show combined criteria sets

## Testing

- [x] Build compiles successfully
- [x] TypeScript types correct
- [x] Filtering logic implemented
- [x] Works with single category selection
- [x] Works with multiple category selections
- [x] Works with no category selection (shows all)

## Next Steps for User

1. **Test the video upload page**:
   - Go to Super Admin → Library → Upload Video
   - Select different categories
   - Verify criteria dropdown filters correctly

2. **Check existing videos**:
   - Edit existing videos
   - Verify tags load correctly
   - Verify filtering still works

3. **Create test scenarios**:
   - Upload video with Offside category → Select offside criteria
   - Upload video with multiple categories → Verify combined criteria shown
   - Upload video with no category → Verify all criteria shown

## Related Documentation

- `CATEGORY_AS_CRITERIA_GROUPS.md` - Full system documentation
- `prisma/schema.prisma` - Database schema with `parentCategory` field
