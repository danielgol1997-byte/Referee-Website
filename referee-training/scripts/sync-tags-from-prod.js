#!/usr/bin/env node
/**
 * Sync tags (and categories) from production DB into local DB.
 * - Skips the "laws" category so local law tags/links stay intact.
 * - Preserves local allowLinks flag on tag categories.
 * - Does NOT touch linkUrl for non-law tags.
 *
 * Usage:
 *   PROD_DATABASE_URL="postgresql://..." node scripts/sync-tags-from-prod.js
 */

const { PrismaClient } = require("@prisma/client");

const PROD_DATABASE_URL = process.env.PROD_DATABASE_URL;

if (!PROD_DATABASE_URL) {
  console.error("Missing PROD_DATABASE_URL env var.");
  process.exit(1);
}

const prodPrisma = new PrismaClient({
  datasources: {
    db: { url: PROD_DATABASE_URL },
  },
});

const localPrisma = new PrismaClient();

async function main() {
  console.log("🔄 Syncing tags from production...\n");

  const prodCategories = await prodPrisma.$queryRaw`
    SELECT id, name, slug, description, "canBeCorrectAnswer", "order", "isActive"
    FROM "TagCategory"
  `;
  const prodTags = await prodPrisma.$queryRaw`
    SELECT id, name, slug, "categoryId", "parentCategory", color, description, "order", "isActive"
    FROM "Tag"
  `;

  const prodCategoryById = new Map(prodCategories.map((cat) => [cat.id, cat]));
  const prodCategoryBySlug = new Map(prodCategories.map((cat) => [cat.slug, cat]));

  let createdCategories = 0;
  let updatedCategories = 0;
  let createdTags = 0;
  let updatedTags = 0;
  let skippedTags = 0;

  // Ensure local categories exist (except laws)
  for (const prodCategory of prodCategories) {
    if (prodCategory.slug === "laws") continue;

    const localCategory = await localPrisma.tagCategory.findUnique({
      where: { slug: prodCategory.slug },
    });

    if (!localCategory) {
      await localPrisma.tagCategory.create({
        data: {
          name: prodCategory.name,
          slug: prodCategory.slug,
          description: prodCategory.description,
          canBeCorrectAnswer: prodCategory.canBeCorrectAnswer,
          allowLinks: false,
          order: prodCategory.order,
          isActive: prodCategory.isActive,
        },
      });
      createdCategories += 1;
    } else {
      await localPrisma.tagCategory.update({
        where: { id: localCategory.id },
        data: {
          name: prodCategory.name,
          description: prodCategory.description,
          canBeCorrectAnswer: prodCategory.canBeCorrectAnswer,
          order: prodCategory.order,
          isActive: prodCategory.isActive,
        },
      });
      updatedCategories += 1;
    }
  }

  // Sync tags (skip laws)
  for (const prodTag of prodTags) {
    const prodCategory = prodCategoryById.get(prodTag.categoryId);
    if (!prodCategory || prodCategory.slug === "laws") {
      skippedTags += 1;
      continue;
    }

    const localCategory = await localPrisma.tagCategory.findUnique({
      where: { slug: prodCategory.slug },
    });

    if (!localCategory) {
      console.warn(`⚠️  Missing local category for slug ${prodCategory.slug}; skipping tag ${prodTag.name}`);
      skippedTags += 1;
      continue;
    }

    const existing = await localPrisma.tag.findFirst({
      where: {
        OR: [{ slug: prodTag.slug }, { name: prodTag.name }],
      },
    });

    const tagData = {
      name: prodTag.name,
      slug: prodTag.slug,
      categoryId: localCategory.id,
      parentCategory: prodTag.parentCategory,
      color: prodTag.color,
      description: prodTag.description,
      order: prodTag.order,
      isActive: prodTag.isActive,
    };

    if (existing) {
      await localPrisma.tag.update({
        where: { id: existing.id },
        data: tagData,
      });
      updatedTags += 1;
    } else {
      await localPrisma.tag.create({
        data: tagData,
      });
      createdTags += 1;
    }
  }

  console.log("✅ Sync complete.\n");
  console.log(`TagCategories: ${createdCategories} created, ${updatedCategories} updated`);
  console.log(`Tags: ${createdTags} created, ${updatedTags} updated, ${skippedTags} skipped`);
}

main()
  .catch((error) => {
    console.error("❌ Sync failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prodPrisma.$disconnect();
    await localPrisma.$disconnect();
  });
