# 🎬 Video Library - Implementation Guide

## Overview

The Video Library is a comprehensive UEFA RAP-inspired video training system with modern 3D UI effects, powerful search capabilities, and interactive decision-learning features.

## ✅ What's Been Built

### 1. Database Schema (`prisma/schema.prisma`)
- **VideoCategory**: Hierarchical category system (UEFA RAP structure)
- **VideoClip**: Enhanced with decision information, laws, sanctions, restarts
- **Tag**: Flexible tagging system with categories (CONCEPT, SCENARIO, GENERAL, COMPETITION)
- **VideoTag**: Many-to-many relationship for video tagging
- **Enums**: VideoType, RestartType, SanctionType, TagCategory

### 2. Seeded Data
- **5 Main Categories** (UEFA RAP 2025:1 structure):
  - 🏃 Challenges (Fouls, Handball, Holding, Offside)
  - 🎯 Management (Advantage, Communication, Positioning, Teamwork)
  - 🟨 Disciplinary (Yellow Cards, Red Cards - DOGSO, Red Cards - SFP, Second Yellow)
  - 📏 Procedures (Free Kicks, Penalty Kicks, Restarts, Substitutions)
  - 🎬 VAR (Goals/No Goals, Penalty Decisions, Red Card Incidents, Mistaken Identity)

- **13 Pre-configured Tags**:
  - Concepts: Handball, Offside, DOGSO, SPA, Simulation, Serious Foul Play
  - Scenarios: Penalty Area, Counter Attack, Set Piece, Corner Kick
  - General: Clear Decision, Difficult Decision, Controversial

- **3 Demo Videos** (metadata only - videos need to be added):
  - Handball in Penalty Area - Deliberate Contact
  - Offside - Active Interference with Play
  - DOGSO - Last Defender Foul

### 3. 3D Components (`/components/library/`)

#### VideoCategoryCard.tsx
- **Purpose**: Display main category cards with 3D tilt effect
- **Features**:
  - Mouse-move 3D rotation (perspective-based)
  - Smooth scale on hover (1.0 → 1.02)
  - Shimmer effect overlay
  - Staggered entrance animations
  - Color theming per category
  - Video count display

#### VideoCard3D.tsx
- **Purpose**: Individual video cards for grids
- **Features**:
  - 3D tilt effect (reduced degree for compactness)
  - Thumbnail with gradient overlay
  - Duration & view count badges
  - Law number tags
  - Sanction type badges (🟨 🟥)
  - Restart type abbreviations
  - "Watch & Learn" CTA button
  - Three sizes: small, medium, large

#### VideoCarousel3D.tsx
- **Purpose**: Featured video carousel with 3D perspective
- **Features**:
  - Center card elevated (scale 1.0)
  - Side cards visible but smaller (scale 0.85, opacity 0.6)
  - Smooth transitions
  - Touch gestures (swipe on mobile)
  - Keyboard navigation (arrow keys)
  - Indicator dots
  - Auto-play with pause on hover
  - Mobile-optimized (simplified on small screens)

#### DecisionReveal.tsx
- **Purpose**: Interactive decision learning component
- **Features**:
  - "Show Decision" CTA button
  - Smooth expand/collapse animation
  - Structured sections:
    - ✅ Correct Decision (with restart, laws)
    - 📋 Explanation
    - 💡 Key Decision Points
    - ⚠️ Common Mistakes
    - 🎬 VAR Protocol (if applicable)
  - Color-coded sections
  - Analytics callback support

### 4. Page Routes

#### `/library/videos` (Landing Page)
- Hero section with gradient background
- Category grid (3D tilt cards)
- Search teaser section
- Features:
  - Video count per category
  - Staggered entrance animations
  - Responsive grid (1/2/3 columns)

#### `/library/videos/[slug]` (Category Page)
- Breadcrumb navigation
- Category header with icon
- Subcategory filter pills
- Featured videos carousel (3D)
- All videos grid
- Sort dropdown
- Features:
  - Hierarchical navigation
  - Featured content highlight
  - Responsive layout

#### `/library/videos/watch/[id]` (Video Detail)
- Large video player
- Video info (title, views, duration, category)
- Description
- Tag chips
- **Decision Reveal Component** (main feature!)
- Related videos sidebar
- Features:
  - Clean, focused layout
  - Sticky sidebar on desktop
  - Mobile-optimized player

#### `/library/videos/search` (Search Page)
- Free text search bar
- Multi-dimensional filters:
  - Laws (1-17)
  - Restarts (FK, PK, CK, GK, TI)
  - Sanctions (Yellow, Red, No Card)
- Results grid
- Features:
  - Real-time filtering
  - Pill chip toggles
  - Loading states
  - Empty states

### 5. API Routes

#### `GET /api/library/videos/search`
- **Parameters**:
  - `q` (text search)
  - `laws` (comma-separated numbers)
  - `restarts` (comma-separated types)
  - `sanctions` (comma-separated types)
  - `tags` (comma-separated IDs)
- **Features**:
  - Full-text search (title, description)
  - Multi-dimensional filtering
  - 50 result limit
  - Sorted by featured → views → date
- **Response**: Array of video objects with metadata

### 6. Styling & Animations

#### Tailwind Config Updates
- Added `cyan` color palette (video library accent)
- Added `warm` color palette (beige/gold)
- Added `perspective` utilities (1000px, 2000px)
- Added animations: `shimmer`, `slide-in-from-top-4`, `fade-in`

#### Global CSS Updates
- `.perspective-1000` and `.perspective-2000` utilities
- `.transform-gpu` for GPU acceleration
- Mobile optimizations (simplified 3D on < 768px)
- `prefers-reduced-motion` support

## 🎥 Next Steps: Adding Videos

### Directory Structure
Create these directories in `/public/`:

```
public/
  videos/
    demo/
      handball-pa-1.mp4
      offside-active-1.mp4
      dogso-1.mp4
      thumbnails/
        handball-pa-1.jpg
        offside-active-1.jpg
        dogso-1.jpg
```

### Video Recommendations
- **Format**: MP4 (H.264 codec)
- **Resolution**: 1280x720 or 1920x1080
- **Duration**: 30 seconds to 2 minutes (ideal for learning clips)
- **File Size**: < 10MB per video (for fast loading)

### Thumbnail Recommendations
- **Format**: JPG or WebP
- **Resolution**: 1280x720 (16:9 aspect ratio)
- **File Size**: < 100KB
- **Content**: Key moment from the video

## 🔧 Super Admin Features (To Be Built)

### Video Upload/Management Interface
Location: `/super-admin?tab=library&view=videos`

**Features Needed**:
1. Video upload with drag & drop
2. Thumbnail upload or auto-extraction
3. Form fields:
   - Title, description
   - Category selection (hierarchical dropdown)
   - Law number multi-select (checkboxes 1-17)
   - Sanction type dropdown
   - Restart type dropdown
   - Tag picker (from tag pool)
   - Decision information:
     - Correct decision text
     - Explanation (rich text editor)
     - Key points (array input)
     - Common mistakes (array input)
     - VAR notes
   - Visibility toggles (active, featured)
4. Video list with search/filter
5. Edit/delete actions
6. Bulk operations

### Tag Pool Management
Location: `/super-admin?tab=library&view=tags`

**Features Needed**:
1. Tag creation form (name, category, color)
2. Tag list with edit/delete
3. Color picker for tag theming
4. Category assignment (CONCEPT, SCENARIO, etc.)
5. Active/inactive toggle

## 📊 Analytics (Optional Future Enhancement)

Track:
- Video views (already has viewCount field)
- Decision reveals (DecisionReveal has onReveal callback)
- Search queries (for improving content)
- Most popular categories/tags
- User learning patterns

## 🎨 Design Highlights

### Color Palette
- **Primary**: Cyan (#00E8F8) - Video library accent
- **Secondary**: Warm beige/gold (#C4A77D) - Supporting accent
- **Background**: Dark slate (#2C3542 to #414F60)
- **Text**: High contrast white (#FFFFFF to #CBD5E1)

### 3D Effects
- **Tilt Rotation**: Max 15° for categories, 8° for video cards
- **Hover Scale**: 1.02 for categories, 1.03 for videos
- **Perspective**: 1000px standard, 2000px for carousels
- **Transitions**: 300ms for interactions, 500ms for animations

### Responsive Breakpoints
- **Mobile**: < 768px (1 column, simplified 3D)
- **Tablet**: 768px - 1024px (2 columns)
- **Desktop**: > 1024px (3 columns, full 3D)

## 🚀 Performance Optimizations

### Implemented
- CSS transforms (GPU-accelerated)
- `will-change: transform` on hover
- Lazy loading (Next.js Image)
- Reduced motion support
- Mobile-specific optimizations
- Simplified effects on small screens

### Future Optimizations
- Intersection Observer for viewport-based loading
- Virtual scrolling for large video lists
- Video thumbnail CDN
- Progressive video streaming
- Service worker for offline caching

## 🧪 Testing the System

### 1. View Categories
Navigate to: `http://localhost:3000/library/videos`
- Should see 5 main category cards with 3D tilt
- Hover to see effects

### 2. Browse Category
Click on "Challenges" or any category
- Should see subcategories (Fouls, Handball, etc.)
- Should see demo videos in grid

### 3. Watch Video
Click "Watch & Learn" on a demo video
- Video player (will show error until actual video files added)
- Click "Show Correct Decision" button
- Decision information should expand with sections

### 4. Search
Navigate to: `http://localhost:3000/library/videos/search`
- Try searching for "handball"
- Toggle law filters
- Check results update

## 📝 Code Examples

### Adding a New Video (Programmatically)
```javascript
const video = await prisma.videoClip.create({
  data: {
    title: "Simulation in Penalty Area",
    description: "Player goes down easily with minimal contact",
    fileUrl: "/videos/simulation-1.mp4",
    thumbnailUrl: "/videos/thumbnails/simulation-1.jpg",
    duration: 85,
    videoType: "MATCH_CLIP",
    categoryId: libraryCategory.id, // Required
    videoCategoryId: challengesCategory.id,
    correctDecision: "No Penalty + Yellow Card for Simulation",
    decisionExplanation: "Clear dive with no contact...",
    keyPoints: ["No contact", "Exaggerated fall", "..."],
    lawNumbers: [12],
    sanctionType: "YELLOW_CARD",
    restartType: "DIRECT_FREE_KICK",
    uploadedById: adminUser.id,
    isActive: true,
  }
});
```

### Adding Tags to a Video
```javascript
await prisma.videoTag.create({
  data: {
    videoId: video.id,
    tagId: simulationTag.id,
  }
});
```

## 🎯 Key Features Summary

✅ UEFA RAP-inspired hierarchical categories  
✅ Powerful multi-dimensional search (laws, sanctions, restarts, tags, text)  
✅ Interactive decision learning (reveal correct decision with explanation)  
✅ Modern 3D UI with tilt effects and smooth animations  
✅ Mobile-optimized and performance-conscious  
✅ Scalable architecture (supports thousands of videos)  
✅ Rich metadata (laws, sanctions, restarts, VAR notes)  
✅ Featured content carousel  
✅ Related videos suggestions  

## 🔗 Related Documentation

- Main README: `/README.md`
- Deployment Notes: `/DEPLOY_NOTES.md`
- Database Schema: `/prisma/schema.prisma`
- Design Tokens: `/lib/design-tokens.ts`

---

**Built**: December 17, 2025  
**Status**: ✅ Core Prototype Complete (Ready for video content)  
**Next**: Add actual video files and super admin upload interface
