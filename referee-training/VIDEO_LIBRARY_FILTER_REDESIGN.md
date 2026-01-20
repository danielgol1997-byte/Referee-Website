# Video Library Filter Bar - Complete Redesign

## Summary

Completely redesigned the video library filter bar with multi-select capabilities, color-coded bubbles, customizable filter visibility, and improved UX.

## New Features

### 1. Multi-Select Dropdowns
- **Multiple selections** per filter type
- Select multiple categories, restarts, criteria, sanctions, scenarios, and laws
- Videos match if they have ANY of the selected values (OR logic)

### 2. Color-Coded Bubbles
- Each selected filter appears as a **colored bubble**
- **X button** in top-left corner to remove individual selections
- Colors match tag colors from the admin panel:
  - Category: `#FF6B6B` (red)
  - Criteria: `#FFD93D` (yellow)
  - Restart: `#4A90E2` (blue)
  - Sanction: `#EC4899` (pink)
  - Scenario: `#6BCF7F` (green)
  - Law: `#9B72CB` (purple)

### 3. Customizable Filter Bar
- **Gear icon** opens settings panel
- Choose which filters to show/hide
- **Default visible**: Category, Criteria, Restart, Sanction
- **Optional**: Scenario, Law
- **Rule**: Criteria requires Category (can't be shown alone)
- Preferences saved to localStorage

### 4. Improved Dropdown Design
- Modern dropdown style consistent with website design
- Color-coded borders matching tag colors
- Search-less (no need - dropdowns are manageable)
- Checkmark shows selected items
- Selected items highlighted with colored background

### 5. RAP Category Tabs (Bottom Section)
- **Removed "All Videos"** tab
- Now shows only 5 RAP categories:
  - Decision Making (A)
  - Management (B)
  - Offside (C)
  - Teamwork (D)
  - Laws of the Game (L)
- **Toggle behavior**: Click to select, click again to deselect
- Tooltip shows "Click to deselect" when active

## Filter Logic

### Multi-Select Behavior
```typescript
// Example: User selects "Handball" and "Offside" categories
categoryTags: ["handball", "offside"]

// Videos shown: ANY video tagged with Handball OR Offside
// (OR logic within a filter type)
```

### Cross-Filter Behavior
```typescript
// Example: Multiple filter types active
categoryTags: ["handball"]
sanctions: ["yellow-card", "red-card"]

// Videos shown: Videos with Handball AND (Yellow Card OR Red Card)
// (AND logic between filter types, OR within each type)
```

### Criteria Dependency
- Criteria dropdown **disabled** until at least one category selected
- Shows criteria from ALL selected categories
- Example: Select "Offside" + "Handball" → See offside AND handball criteria

## User Interface

### Filter Dropdown
```
┌─────────────────────────────┐
│ 🔴 Category                 │
│ ┌─────────────────────────┐ │
│ │ ⓧ Handball              │ │ ← Selected bubble
│ │ ⓧ Offside               │ │ ← Selected bubble
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ 🔴 2 selected        ▼  │ │ ← Dropdown button
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

### Settings Panel
```
┌──────────────────────────┐
│ ⚙️ Customize Filters     │
│ ──────────────────────── │
│ ☑ 🔴 Category            │
│ ☑ 🟡 Criteria            │
│ ☑ 🔵 Restart             │
│ ☑ 🌸 Sanction            │
│ ☐ 🟢 Scenario            │
│ ☐ 🟣 Law                 │
│ ──────────────────────── │
│ * Criteria requires      │
│   Category               │
└──────────────────────────┘
```

### RAP Category Tabs (Bottom)
```
BROWSE BY CATEGORY

┌─────────────────┐  ┌───────────┐  ┌─────────┐  ┌──────────┐  ┌────────────────┐
│ DECISION MAKING │  │ MANAGEMENT│  │ OFFSIDE │  │ TEAMWORK │  │ LAWS OF THE    │
│       12        │  │     8     │  │    5    │  │    3     │  │     GAME       │
└─────────────────┘  └───────────┘  └─────────┘  └──────────┘  └────────────────┘
  (selected)           (unselected)
```

## Technical Implementation

### New Filter State Structure
```typescript
interface VideoFilters {
  categoryTags: string[];    // Changed from categoryTag
  restarts: string[];        // Changed from restart
  criteria: string[];        // Changed from criteria
  sanctions: string[];       // Changed from sanction
  scenarios: string[];       // Changed from scenario
  laws: number[];            // Changed from law
  rapCategory?: RAPCategory; // Kept for RAP tab sync
}
```

### Filter Components
- `VideoFilterBar.tsx` - Main filter bar component
- `FilterDropdown` - Individual multi-select dropdown component
- `VideoLibraryView.tsx` - Updated filter logic
- `RAPCategoryTabs.tsx` - Updated RAP tabs

### Key Functions
```typescript
// Add filter
addFilter(type: FilterType, value: string | number)

// Remove individual filter
removeFilter(type: FilterType, value: string | number)

// Toggle filter visibility
toggleFilterVisibility(type: FilterType)

// Clear all filters
clearAllFilters()
```

## User Workflows

### Workflow 1: Multi-Category Search
1. Open Category dropdown
2. Click "Handball" (bubble appears)
3. Click "Offside" (second bubble appears)
4. See all videos with Handball OR Offside

### Workflow 2: Narrow by Criteria
1. Select "Handball" category
2. Criteria dropdown activates
3. Select "Hand/Arm Makes Body Bigger"
4. See handball videos with that specific criterion

### Workflow 3: Remove Individual Filter
1. Multiple filters selected
2. Click X on "Handball" bubble
3. That filter removed, others remain
4. Videos update immediately

### Workflow 4: Customize Filter Bar
1. Click gear icon
2. Uncheck "Sanction"
3. Sanction filter disappears from bar
4. Check "Law"
5. Law filter appears
6. Preference saved for next visit

### Workflow 5: Toggle RAP Category
1. Scroll to bottom tabs
2. Click "Decision Making"
3. See only decision-making videos
4. Click "Decision Making" again
5. Deselect - see all videos

## Benefits

1. ✅ **More powerful** - Can combine multiple filters
2. ✅ **Better UX** - See exactly what's filtered (bubbles)
3. ✅ **Flexible** - Remove individual filters without clearing all
4. ✅ **Customizable** - Show only filters you need
5. ✅ **Color-coded** - Visual clarity matching tag system
6. ✅ **Modern design** - Professional dropdown style
7. ✅ **Persistent** - Settings saved across sessions
8. ✅ **Responsive** - Works on mobile and desktop

## Files Modified

- `components/library/VideoFilterBar.tsx` - Complete rewrite
- `components/library/VideoLibraryView.tsx` - Updated filter logic
- `components/library/RAPCategoryTabs.tsx` - Removed "All Videos", added toggle

## Migration Notes

### Breaking Changes
- Filter state structure changed from single values to arrays
- `categoryTag` → `categoryTags`
- `restart` → `restarts`
- `criteria` → `criteria` (already plural, now array)
- `sanction` → `sanctions`
- `scenario` → `scenarios`
- `law` → `laws`

### Backward Compatibility
- Old URLs with single filters will need migration
- localStorage filter preferences use new structure
- Any bookmarked filter URLs will reset

## Testing Checklist

- [ ] Multi-select works for all filter types
- [ ] Bubbles display with correct colors
- [ ] X buttons remove individual filters
- [ ] Criteria disabled without category selection
- [ ] Criteria shows options from all selected categories
- [ ] Settings panel toggles filters
- [ ] Settings persist across page refreshes
- [ ] RAP tabs toggle on/off
- [ ] "Clear All Filters" works
- [ ] Filter counts update correctly
- [ ] Mobile dropdown works
- [ ] Hover-to-show filter bar works
- [ ] Color coding matches admin tag colors

## Future Enhancements

- Add search within dropdowns for large tag lists
- Add "Select All" / "Deselect All" options
- Add filter presets/saved searches
- Add URL parameter support for sharing filtered views
- Add filter history (recently used filters)
