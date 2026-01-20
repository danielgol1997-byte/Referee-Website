# 🚀 Deployment & Data Safety Guide

## ✅ 1. Is My Data Safe?
**YES.**
- **Editing/Deleting Tags:** All changes are saved to your database immediately.
- **Deploying Code:** Deploying code **does NOT** delete your database data.
- **Other Data:** Your "Laws of the Game", Users, and Videos are in completely separate tables (`Category`, `Question`, `User`, `VideoClip`). The changes we made to the `Tag` system do not touch these tables at all.

---

## 🔄 2. How to Sync Production Tags
While your code changes will deploy automatically, the **data updates** (like the new rainbow colors and category structure) are currently only in your *local* database.

To apply these changes to your **production/live** database without breaking anything, follow these steps:

### Option A: Run Scripts (Recommended)
You can run the safety scripts against your production database.

1. **Get your Production Database URL** (from Vercel/Supabase/Railroad env vars).
2. **Run the sync script:**
   ```bash
   # In your terminal
   DATABASE_URL="your_production_db_url_here" node scripts/safe-sync-tags.js
   ```
   *What this does:*
   - Creates/Updates the 14 main Category tags with rainbow colors.
   - Renames "Illegal Use Of Arms" criteria to avoid conflicts.
   - **Safe:** Does NOT delete any of your other tags.

3. **Run the auto-assign script:**
   ```bash
   DATABASE_URL="your_production_db_url_here" node scripts/auto-assign-criteria-categories.js
   ```
   *What this does:*
   - Goes through your existing criteria tags in production.
   - Automatically groups them under the correct Category (Handball, Offside, etc.).
   - **Safe:** Only updates tags that aren't already categorized.

### Option B: Manual Update
If you prefer not to run scripts, you can:
1. Go to your live Super Admin dashboard.
2. Manually create/edit the 14 Category tags.
3. Manually edit Criteria tags to assign them to categories.

---

## 🛡️ Database Safety Rules

To ensure you never "ruin everything else":

1. **Never run `prisma migrate reset`** in production. This wipes the DB.
2. **Always use `prisma migrate deploy`** for production schema updates.
3. **Backup your data** before running bulk update scripts (like the ones above) if you are paranoid.

## 📦 What to Commit
Make sure you commit all the new files before deploying:
- `components/admin/library/TagManager.tsx` (The new UI)
- `prisma/schema.prisma` (The schema updates)
- `scripts/*.js` (The helper scripts)
- `app/api/...` (The updated API routes)

Your `Laws of the Game` and other content are 100% safe!
