# Laws Tagging System - Manual Testing Checklist

## Code Changes Verification

### ✅ 1. Laws Color Consistency
- **Law tags color**: `#9B72CB` (defined in `prisma/migrate-laws-to-tags.js`)
- **Laws category color**: `#9B72CB` (defined in `VideoFilterBar.tsx` GROUP_COLORS)
- **Status**: Colors match perfectly ✓

### ✅ 2. VideoFilterBar Fixes
- **Issue**: Runtime error "Cannot read properties of undefined (reading 'color')"
- **Root Cause**: Old 'law' filter type no longer exists in FILTER_CONFIG
- **Fix Applied**:
  - Added null check in `getFilterConfig()` to return null for deprecated types
  - Added null check before rendering filters in main filter bar (line 466-467)
  - Added null check before rendering filters in settings menu (line 507)
- **Status**: Fixed ✓

### ✅ 3. Migration Script
- **File**: `prisma/migrate-laws-to-tags.js`
- **Creates**: Laws category (order: 0, first position)
- **Creates**: 17 law tags (Law 1-17 with official IFAB names)
- **Migrates**: Existing VideoClip.lawNumbers → VideoTag relationships
- **Status**: Complete ✓

### ✅ 4. Scroll Behavior Improvements
- **Added to**: dropdown-menu.tsx, select.tsx, multi-select.tsx, VideoFilterBar.tsx
- **Properties**: 
  - `overscrollBehavior: 'contain'`
  - `touchAction: 'pan-y'`
  - `WebkitOverflowScrolling: 'touch'`
- **Status**: Applied ✓

## Manual Testing Steps

### Test 1: Tag Manager - Laws Category Exists
1. Login as super admin
2. Navigate to Super Admin → Library → Tags
3. **Verify**: 
   - [ ] "Laws" category appears FIRST in the list
   - [ ] Category shows 17 tags
   - [ ] Individual law tags visible (Law 1 - The Field of Play, etc.)
   - [ ] Category is marked as "Filter only" (not correct answer)

### Test 2: Video Upload Form - Laws Dropdown
1. Navigate to Library page
2. Click "Upload Video" button
3. **Verify**:
   - [ ] "Laws" dropdown appears in the tagging section
   - [ ] Dropdown shows purple color indicator (#9B72CB)
   - [ ] Clicking opens dropdown with all 17 laws
   - [ ] Can select multiple laws
   - [ ] Selected laws appear as badges with purple color

### Test 3: Video Library Filter - Laws Filter
1. Navigate to Library page
2. Hover over the top area to reveal filter bar
3. **Verify**:
   - [ ] "Laws" filter button appears
   - [ ] Color indicator is purple (#9B72CB)
   - [ ] Clicking opens dropdown with law options
   - [ ] Can select laws to filter videos
   - [ ] Selected laws appear as badges with purple color
   - [ ] Filter badge color matches dropdown color

### Test 4: Settings Menu - Laws Filter Configuration
1. In Library page with filter bar visible
2. Click the settings gear icon
3. **Verify**:
   - [ ] "Laws" appears in the filter list
   - [ ] Can toggle visibility on/off
   - [ ] Can drag to reorder (but should default to appearing with categories)

### Test 5: No Runtime Errors
1. Open browser console (F12)
2. Navigate to Library page
3. Hover to reveal filter bar
4. **Verify**:
   - [ ] NO error: "Cannot read properties of undefined (reading 'color')"
   - [ ] NO TypeScript errors in console
   - [ ] Filter bar renders correctly

### Test 6: Dropdown Scroll Behavior
1. On Library page, open Laws filter dropdown
2. **Test on different devices/browsers**:
   - [ ] Trackpad scroll works smoothly
   - [ ] Mouse wheel scroll works
   - [ ] Touch scroll works on mobile
   - [ ] No page scroll when scrolling in dropdown

### Test 7: Migration Verification (If videos exist)
1. Check if any videos were previously tagged with lawNumbers
2. Navigate to Library and apply Laws filter
3. **Verify**:
   - [ ] Previously tagged videos appear when filtering by their laws
   - [ ] VideoTag relationships created correctly

## Color Verification

### Expected Color: `#9B72CB` (Purple)
- RGB: `rgb(155, 114, 203)`
- HSL: `hsl(274, 48%, 62%)`

**Visual Check**: The color should be a medium purple, consistent across:
- Law tag badges in upload form
- Laws filter button and dropdown
- Law tag indicators in Tag Manager
- Selected law badges in filter bar

## Known Issues (If Any)

_Document any issues found during testing here_

## Test Results

**Date**: _____________
**Tester**: _____________
**Browser**: _____________
**OS**: _____________

**Overall Status**: ☐ Pass  ☐ Fail  ☐ Needs Review

**Notes**:
_____________________________________________
_____________________________________________
_____________________________________________
