/**
 * RESTORE DATABASE FROM PRODUCTION
 * 
 * This script copies all questions from production database to local database.
 * It's the REVERSE of copy-local-lotg-to-prod.js
 * 
 * Usage:
 *   PROD_DATABASE_URL="postgresql://..." node prisma/restore-from-production.js
 * 
 * Or if you have it in .env as PRODUCTION_DATABASE_URL:
 *   node prisma/restore-from-production.js
 */

const { PrismaClient } = require("@prisma/client");

function requireEnv(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) {
    return null;
  }
  return v;
}

function createClient(url) {
  return new PrismaClient({
    datasources: { db: { url } },
  });
}

async function main() {
  console.log('\n🔄 PRODUCTION DATABASE RESTORE\n');
  
  const localUrl = requireEnv("DATABASE_URL");
  if (!localUrl) {
    throw new Error("Missing DATABASE_URL in environment");
  }
  
  // Try multiple possible env var names for production
  const prodUrl = 
    requireEnv("PROD_DATABASE_URL") || 
    requireEnv("PRODUCTION_DATABASE_URL") ||
    requireEnv("VERCEL_DATABASE_URL");
  
  if (!prodUrl) {
    console.error('❌ Production database URL not found!');
    console.error('\nPlease provide it in one of these ways:\n');
    console.error('  1. Set PROD_DATABASE_URL environment variable:');
    console.error('     PROD_DATABASE_URL="postgresql://..." node prisma/restore-from-production.js\n');
    console.error('  2. Add to .env file:');
    console.error('     PROD_DATABASE_URL="postgresql://..."');
    console.error('     or PRODUCTION_DATABASE_URL="postgresql://..."\n');
    console.error('  3. Get it from Vercel:');
    console.error('     npx vercel env pull .env.production');
    console.error('     (then look for POSTGRES_URL or DATABASE_URL)\n');
    process.exit(1);
  }

  console.log('📊 Production DB:', prodUrl.replace(/:[^:@]+@/, ':***@'));
  console.log('📊 Local DB:', localUrl.replace(/:[^:@]+@/, ':***@'));
  console.log('');

  const prod = createClient(prodUrl);
  const local = createClient(localUrl);

  try {
    // Get counts from production
    const prodCounts = {
      questions: await prod.question.count(),
      lotg: await prod.question.count({ where: { type: 'LOTG_TEXT' } }),
      videoClips: await prod.videoClip.count(),
      categories: await prod.category.count(),
    };

    console.log('📈 Production Database Stats:');
    console.log(`   - Total Questions: ${prodCounts.questions}`);
    console.log(`   - LOTG Questions: ${prodCounts.lotg}`);
    console.log(`   - Video Clips: ${prodCounts.videoClips}`);
    console.log(`   - Categories: ${prodCounts.categories}`);
    console.log('');

    if (prodCounts.questions === 0) {
      console.log('⚠️  Production database appears empty. Nothing to restore.');
      process.exit(0);
    }

    console.log('🔄 Starting restore...\n');

    // 1. Build category ID mapping (prod ID -> local ID by slug)
    console.log('📁 Building category mapping...');
    const prodCategories = await prod.category.findMany();
    const localCategories = await local.category.findMany();
    
    const categoryMap = new Map();
    let categoriesRestored = 0;
    
    for (const prodCat of prodCategories) {
      let localCat = localCategories.find(c => c.slug === prodCat.slug);
      
      if (!localCat) {
        // Create missing category
        localCat = await local.category.create({
          data: {
            name: prodCat.name,
            slug: prodCat.slug,
            type: prodCat.type,
            description: prodCat.description,
            order: prodCat.order,
          },
        });
        categoriesRestored++;
        localCategories.push(localCat);
      }
      
      categoryMap.set(prodCat.id, localCat.id);
    }
    console.log(`   ✅ Mapped ${categoryMap.size} categories (${categoriesRestored} created)\n`);

    // 2. Copy Video Clips (skip if schema incompatible)
    console.log('🎥 Checking video clips...');
    let clipsRestored = 0;
    try {
      const prodClips = await prod.videoClip.findMany();
      
      for (const clip of prodClips) {
        const localCategoryId = categoryMap.get(clip.categoryId);
        if (!localCategoryId) continue; // Skip if category doesn't exist
        
        const exists = await local.videoClip.findFirst({
          where: { title: clip.title, categoryId: localCategoryId }
        });
        if (!exists) {
          // Skip tags if schemas are different
          const clipData = {
            title: clip.title,
            fileUrl: clip.fileUrl,
            thumbnailUrl: clip.thumbnailUrl,
            duration: clip.duration,
            categoryId: localCategoryId, // Use mapped category ID
          };
          
          // Only add tags if they're a simple array
          if (Array.isArray(clip.tags)) {
            clipData.tags = clip.tags;
          }
          
          await local.videoClip.create({ data: clipData });
          clipsRestored++;
        }
      }
      console.log(`   ✅ Restored ${clipsRestored} video clips (${prodClips.length - clipsRestored} already existed)\n`);
    } catch (error) {
      console.log(`   ⚠️  Skipping video clips (schema incompatible): ${error.message}\n`);
    }

    // 3. Copy Questions (with Answer Options)
    console.log('📝 Restoring questions...');
    const batchSize = 50;
    let questionsRestored = 0;
    let questionsSkipped = 0;
    
    let cursor = undefined;
    while (true) {
      const rows = await prod.question.findMany({
        include: { answerOptions: true },
        orderBy: { id: 'asc' },
        take: batchSize,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });

      if (rows.length === 0) break;
      cursor = rows[rows.length - 1].id;

      for (const q of rows) {
        const localCategoryId = categoryMap.get(q.categoryId);
        if (!localCategoryId) {
          questionsSkipped++;
          continue; // Skip if category doesn't exist
        }
        
        // Check if question already exists
        const exists = await local.question.findFirst({
          where: { 
            text: q.text,
            categoryId: localCategoryId,
            type: q.type
          },
        });
        
        if (exists) {
          questionsSkipped++;
          continue;
        }

        // Create question with answer options
        await local.question.create({
          data: {
            type: q.type,
            categoryId: localCategoryId, // Use mapped category ID
            videoClipId: q.videoClipId,
            text: q.text,
            explanation: q.explanation,
            difficulty: q.difficulty ?? 1,
            isActive: q.isActive ?? true,
            isVar: q.isVar ?? false,
            lawNumbers: Array.isArray(q.lawNumbers) ? q.lawNumbers : [],
            answerOptions: {
              create: (q.answerOptions || [])
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                .map((opt, idx) => ({
                  label: opt.label,
                  code: opt.code || `OPT_${idx}`,
                  isCorrect: !!opt.isCorrect,
                  order: opt.order ?? idx,
                })),
            },
          },
        });

        questionsRestored++;
      }

      console.log(`   Progress: ${questionsRestored} restored, ${questionsSkipped} skipped...`);
    }

    console.log(`\n✅ Restore complete!`);
    console.log(`   - Questions restored: ${questionsRestored}`);
    console.log(`   - Questions skipped (duplicates): ${questionsSkipped}`);
    console.log(`   - Categories restored: ${categoriesRestored}`);
    console.log(`   - Video clips restored: ${clipsRestored}`);
    console.log('');

    // Show final counts
    const localCounts = {
      questions: await local.question.count(),
      lotg: await local.question.count({ where: { type: 'LOTG_TEXT' } }),
    };

    console.log('📊 Local Database Now Has:');
    console.log(`   - Total Questions: ${localCounts.questions}`);
    console.log(`   - LOTG Questions: ${localCounts.lotg}`);
    console.log('');

  } catch (error) {
    console.error('\n❌ Error during restore:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await Promise.allSettled([prod.$disconnect(), local.$disconnect()]);
  }
}

main();
