import { prisma } from "@/lib/prisma";

interface CachedTag {
  id: string;
  name: string;
  slug: string;
  parentCategory: string | null;
}

interface CachedTagCategory {
  id: string;
  name: string;
  slug: string;
  tags: CachedTag[];
}

interface TaxonomyCache {
  categories: CachedTagCategory[];
  textRepresentation: string;
  fetchedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let cache: TaxonomyCache | null = null;

async function fetchTaxonomy(): Promise<TaxonomyCache> {
  const tagCategories = await prisma.tagCategory.findMany({
    where: { isActive: true },
    include: {
      tags: {
        where: { isActive: true },
        orderBy: [{ order: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          slug: true,
          parentCategory: true,
        },
      },
    },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });

  const categories: CachedTagCategory[] = tagCategories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    tags: cat.tags.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      parentCategory: t.parentCategory,
    })),
  }));

  const lines: string[] = ["TAG TAXONOMY (all available tags in the system):"];
  for (const cat of categories) {
    const grouped = new Map<string, CachedTag[]>();
    for (const tag of cat.tags) {
      const group = tag.parentCategory || "__root__";
      if (!grouped.has(group)) grouped.set(group, []);
      grouped.get(group)!.push(tag);
    }

    if (grouped.size === 1 && grouped.has("__root__")) {
      const tagNames = cat.tags.map((t) => `"${t.name}" (slug: ${t.slug})`);
      lines.push(`\nCategory "${cat.name}" (slug: ${cat.slug}):`);
      lines.push(`  Tags: ${tagNames.join(", ")}`);
    } else {
      lines.push(`\nCategory "${cat.name}" (slug: ${cat.slug}):`);
      for (const [group, tags] of grouped) {
        const tagNames = tags.map((t) => `"${t.name}" (slug: ${t.slug})`);
        if (group === "__root__") {
          lines.push(`  Tags: ${tagNames.join(", ")}`);
        } else {
          lines.push(`  [${group}]: ${tagNames.join(", ")}`);
        }
      }
    }
  }

  return {
    categories,
    textRepresentation: lines.join("\n"),
    fetchedAt: Date.now(),
  };
}

export async function getTagTaxonomy(): Promise<TaxonomyCache> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache;
  }
  cache = await fetchTaxonomy();
  return cache;
}

export async function getTagTaxonomyText(): Promise<string> {
  const taxonomy = await getTagTaxonomy();
  return taxonomy.textRepresentation;
}

export async function getTagTaxonomyCategories(): Promise<CachedTagCategory[]> {
  const taxonomy = await getTagTaxonomy();
  return taxonomy.categories;
}

export function invalidateTagTaxonomyCache(): void {
  cache = null;
}
