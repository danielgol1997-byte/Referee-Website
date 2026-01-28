/**
 * SYNC ALL TAGS: Local → Production
 * 
 * This script copies your entire tag system from local to production:
 * - Creates new tags you added locally
 * - Updates existing tags (colors, categories, order, etc.)
 * - Optionally deletes tags you removed locally
 * 
 * Usage:
 *   PROD_DATABASE_URL="postgresql://..." node prisma/sync-all-tags-to-prod.js
 * 
 * Safety:
 *   - Does NOT touch video metadata or other data
 *   - Does NOT sync VideoTag relationships (those are video-specific)
 *   - Runs in dry-run mode by default (shows what would happen)
 */

const { PrismaClient, TagCategory } = require('@prisma/client');

function createClient(url) {
  return new PrismaClient({
    datasources: { db: { url } },
  });
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) {
    return null;
  }
  return v;
}

async function main() {
  console.log('\n🔄 TAG SYNC: Local → Production\n');
  console.log('━'.repeat(60));
  
  // Get database URLs
  const localUrl = requireEnv('DATABASE_URL');
  if (!localUrl) {
    throw new Error('Missing DATABASE_URL (local database)');
  }
  
  const prodUrl = 
    requireEnv('PROD_DATABASE_URL') || 
    requireEnv('PRODUCTION_DATABASE_URL') ||
    requireEnv('VERCEL_DATABASE_URL');
  
  if (!prodUrl) {
    console.error('❌ Production database URL not found!\n');
    console.error('Please provide it:');
    console.error('  PROD_DATABASE_URL="postgresql://..." node prisma/sync-all-tags-to-prod.js\n');
    process.exit(1);
  }
  
  // Check for dry run mode
  const DRY_RUN = !process.env.EXECUTE; // Must set EXECUTE=true to actually run
  const DELETE_REMOVED = process.env.DELETE_REMOVED === 'true';
  
  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
    console.log('   To execute: EXECUTE=true PROD_DATABASE_URL="..." node prisma/sync-all-tags-to-prod.js\n');
  }
  
  console.log('📊 Databases:');
  console.log(`   Local:  ${localUrl.replace(/:[^:@]+@/, ':***@')}`);
  console.log(`   Prod:   ${prodUrl.replace(/:[^:@]+@/, ':***@')}`);
  console.log('');
  
  const local = createClient(localUrl);
  const prod = createClient(prodUrl);
  
  try {
    // 1. Get all tags from both databases
    console.log('📥 Reading tags from both databases...\n');
    
    const localTags = await local.tag.findMany({
      orderBy: { name: 'asc' }
    });
    
    const prodTags = await prod.tag.findMany({
      orderBy: { name: 'asc' }
    });
    
    console.log(`   Local tags: ${localTags.length}`);
    console.log(`   Production tags: ${prodTags.length}`);
    console.log('');
    
    // 2. Create maps for easy lookup
    const localTagMap = new Map(localTags.map(t => [t.name, t]));
    const prodTagMap = new Map(prodTags.map(t => [t.name, t]));
    
    // 3. Analyze differences
    const toCreate = localTags.filter(t => !prodTagMap.has(t.name));
    const toUpdate = localTags.filter(t => prodTagMap.has(t.name));
    const toDelete = DELETE_REMOVED ? prodTags.filter(t => !localTagMap.has(t.name)) : [];
    
    console.log('📊 Analysis:');
    console.log(`   ✨ New tags to create: ${toCreate.length}`);
    console.log(`   🔄 Existing tags to update: ${toUpdate.length}`);
    if (DELETE_REMOVED) {
      console.log(`   🗑️  Tags to delete: ${toDelete.length}`);
    } else {
      console.log(`   ⏭️  Tags in prod but not local (will keep): ${prodTags.filter(t => !localTagMap.has(t.name)).length}`);
      console.log(`      (Set DELETE_REMOVED=true to delete these)`);
    }
    console.log('');
    
    // 4. Show what would be created
    if (toCreate.length > 0) {
      console.log('✨ New Tags to Create:');
      toCreate.slice(0, 20).forEach(tag => {
        console.log(`   • ${tag.name} (${tag.category}) - ${tag.color || 'no color'}`);
      });
      if (toCreate.length > 20) {
        console.log(`   ... and ${toCreate.length - 20} more`);
      }
      console.log('');
    }
    
    // 5. Show what would be updated
    if (toUpdate.length > 0) {
      console.log('🔄 Tags to Update:');
      let updatesShown = 0;
      toUpdate.forEach(localTag => {
        const prodTag = prodTagMap.get(localTag.name);
        const changes = [];
        
        if (localTag.color !== prodTag.color) changes.push(`color: ${prodTag.color} → ${localTag.color}`);
        if (localTag.category !== prodTag.category) changes.push(`category: ${prodTag.category} → ${localTag.category}`);
        if (localTag.parentCategory !== prodTag.parentCategory) changes.push(`parentCategory: ${prodTag.parentCategory} → ${localTag.parentCategory}`);
        if (localTag.order !== prodTag.order) changes.push(`order: ${prodTag.order} → ${localTag.order}`);
        if (localTag.isActive !== prodTag.isActive) changes.push(`isActive: ${prodTag.isActive} → ${localTag.isActive}`);
        
        if (changes.length > 0 && updatesShown < 20) {
          console.log(`   • ${localTag.name}: ${changes.join(', ')}`);
          updatesShown++;
        }
      });
      if (updatesShown === 0) {
        console.log('   (All tags are already up to date)');
      } else {
        const totalChanges = toUpdate.filter(localTag => {
          const prodTag = prodTagMap.get(localTag.name);
          return localTag.color !== prodTag.color || 
                 localTag.category !== prodTag.category ||
                 localTag.parentCategory !== prodTag.parentCategory ||
                 localTag.order !== prodTag.order ||
                 localTag.isActive !== prodTag.isActive;
        }).length;
        if (totalChanges > 20) {
          console.log(`   ... and ${totalChanges - 20} more tags with changes`);
        }
      }
      console.log('');
    }
    
    // 6. Show what would be deleted
    if (DELETE_REMOVED && toDelete.length > 0) {
      console.log('🗑️  Tags to Delete:');
      toDelete.slice(0, 20).forEach(tag => {
        console.log(`   • ${tag.name} (${tag.category})`);
      });
      if (toDelete.length > 20) {
        console.log(`   ... and ${toDelete.length - 20} more`);
      }
      console.log('');
      console.log('⚠️  WARNING: Deleting tags will also remove their VideoTag relationships!');
      console.log('');
    }
    
    // 7. Execute if not dry run
    if (!DRY_RUN) {
      console.log('🚀 Executing sync...\n');
      
      let created = 0, updated = 0, deleted = 0;
      
      // Create new tags
      for (const tag of toCreate) {
        await prod.tag.create({
          data: {
            name: tag.name,
            slug: tag.slug,
            category: tag.category,
            parentCategory: tag.parentCategory,
            color: tag.color,
            description: tag.description,
            order: tag.order,
            isActive: tag.isActive,
          }
        });
        created++;
        if (created <= 10 || created % 10 === 0) {
          console.log(`   ✅ Created: ${tag.name} (${created}/${toCreate.length})`);
        }
      }
      
      // Update existing tags
      for (const localTag of toUpdate) {
        const prodTag = prodTagMap.get(localTag.name);
        await prod.tag.update({
          where: { id: prodTag.id },
          data: {
            slug: localTag.slug,
            category: localTag.category,
            parentCategory: localTag.parentCategory,
            color: localTag.color,
            description: localTag.description,
            order: localTag.order,
            isActive: localTag.isActive,
          }
        });
        updated++;
      }
      console.log(`   ✅ Updated: ${updated} tags`);
      
      // Delete removed tags
      if (DELETE_REMOVED && toDelete.length > 0) {
        for (const tag of toDelete) {
          await prod.tag.delete({
            where: { id: tag.id }
          });
          deleted++;
          console.log(`   🗑️  Deleted: ${tag.name}`);
        }
      }
      
      console.log('');
      console.log('✨ Sync Complete!');
      console.log(`   Created: ${created}`);
      console.log(`   Updated: ${updated}`);
      console.log(`   Deleted: ${deleted}`);
    } else {
      console.log('✅ Dry run complete. Review the changes above.');
      console.log('   To execute: EXECUTE=true PROD_DATABASE_URL="..." node prisma/sync-all-tags-to-prod.js');
    }
    
  } catch (error) {
    console.error('\n❌ Error during sync:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await Promise.allSettled([local.$disconnect(), prod.$disconnect()]);
  }
}

main();

