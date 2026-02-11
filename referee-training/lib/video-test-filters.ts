import { Prisma } from "@prisma/client";

export type VideoTagFilters = {
  categoryTags?: string[];
  restarts?: string[];
  criteria?: string[];
  sanctions?: string[];
  scenarios?: string[];
  customTagFilters?: Record<string, string[]>;
};

export type AdminVideoTagFilters = {
  search?: string;
  activeStatus?: "all" | "active" | "inactive";
  featuredStatus?: "all" | "featured" | "normal";
  customTagFilters?: Record<string, string[]>;
};

function addTagGroupClause(
  clauses: Prisma.VideoClipWhereInput[],
  slugs?: string[]
) {
  if (!slugs || slugs.length === 0) return;
  clauses.push({
    tags: {
      some: {
        tag: {
          slug: { in: slugs },
          isActive: true,
        },
      },
    },
  });
}

function buildTagClauses(filters: VideoTagFilters) {
  const clauses: Prisma.VideoClipWhereInput[] = [];
  addTagGroupClause(clauses, filters.categoryTags);
  addTagGroupClause(clauses, filters.criteria);
  addTagGroupClause(clauses, filters.restarts);
  addTagGroupClause(clauses, filters.sanctions);
  addTagGroupClause(clauses, filters.scenarios);

  const customFilters = filters.customTagFilters || {};
  Object.values(customFilters).forEach((slugs) => {
    addTagGroupClause(clauses, slugs);
  });

  return clauses;
}

export function buildVideoClipWhereForUser(filters: VideoTagFilters) {
  const clauses = buildTagClauses(filters);
  return {
    isActive: true,
    ...(clauses.length > 0 ? { AND: clauses } : {}),
  } satisfies Prisma.VideoClipWhereInput;
}

export function buildVideoClipWhereForAdmin(
  filters: AdminVideoTagFilters,
  options?: { excludeTagCategory?: string }
) {
  const { excludeTagCategory } = options ?? {};
  const customTagFilters = filters.customTagFilters ?? {};
  const filtersToApply =
    excludeTagCategory && customTagFilters[excludeTagCategory]
      ? { ...customTagFilters, [excludeTagCategory]: undefined }
      : customTagFilters;

  const clauses = buildTagClauses({
    customTagFilters: filtersToApply,
  });

  const where: Prisma.VideoClipWhereInput = {
    ...(clauses.length > 0 ? { AND: clauses } : {}),
  };

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  if (filters.activeStatus === "active") {
    where.isActive = true;
  } else if (filters.activeStatus === "inactive") {
    where.isActive = false;
  }

  if (filters.featuredStatus === "featured") {
    where.isFeatured = true;
  } else if (filters.featuredStatus === "normal") {
    where.isFeatured = false;
  }

  return where;
}
