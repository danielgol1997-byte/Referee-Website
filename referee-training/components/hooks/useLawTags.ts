"use client";

import { useEffect, useMemo, useState } from "react";

type Tag = {
  id: string;
  name: string;
  slug: string;
  color?: string | null;
  order?: number | null;
  linkUrl?: string | null;
};

type TagCategory = {
  id: string;
  name: string;
  slug: string;
  tags: Tag[];
};

export type LawTag = Tag & {
  number: number;
};

const LAW_TAG_CATEGORY_SLUG = "laws";

const extractLawNumber = (tag: Pick<Tag, "name" | "slug">) => {
  const nameMatch = tag.name.match(/\blaw\s*(\d{1,2})\b/i);
  if (nameMatch?.[1]) return Number(nameMatch[1]);
  const slugMatch = tag.slug.match(/law-?(\d{1,2})/i);
  if (slugMatch?.[1]) return Number(slugMatch[1]);
  return null;
};

export function useLawTags() {
  const [lawTags, setLawTags] = useState<LawTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchTags = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/library/tags");
        if (!res.ok) {
          throw new Error("Failed to load tags");
        }
        const data = await res.json();
        const categories: TagCategory[] = data.tagCategories || [];
        const lawsCategory = categories.find((category) => category.slug === LAW_TAG_CATEGORY_SLUG);
        const rawTags = lawsCategory?.tags || [];
        const parsed = rawTags
          .map((tag) => {
            const number = extractLawNumber(tag);
            return number ? { ...tag, number } : null;
          })
          .filter(Boolean) as LawTag[];

        parsed.sort((a, b) => {
          const orderA = Number.isFinite(a.order) ? (a.order as number) : 999;
          const orderB = Number.isFinite(b.order) ? (b.order as number) : 999;
          if (orderA !== orderB) return orderA - orderB;
          if (a.number !== b.number) return a.number - b.number;
          return a.name.localeCompare(b.name);
        });

        if (isMounted) {
          setLawTags(parsed);
        }
      } catch (err) {
        if (isMounted) {
          const message = err instanceof Error ? err.message : "Failed to load tags";
          setError(message);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchTags();

    return () => {
      isMounted = false;
    };
  }, []);

  const lawTagMap = useMemo(() => {
    return new Map(lawTags.map((tag) => [tag.number, tag]));
  }, [lawTags]);

  const lawOptions = useMemo(
    () =>
      lawTags.map((tag) => ({
        value: tag.number,
        label: tag.name,
      })),
    [lawTags]
  );

  const getLawLabel = (lawNumber: number) => {
    return lawTagMap.get(lawNumber)?.name || `Law ${lawNumber}`;
  };

  return {
    lawTags,
    lawOptions,
    lawTagMap,
    getLawLabel,
    isLoading,
    error,
  };
}
