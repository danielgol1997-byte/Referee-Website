/**
 * Fire-and-forget search query logger.
 *
 * Call this from the semantic search route without awaiting it.
 * If logging is disabled or the DB write fails, nothing breaks.
 *
 * To disable logging site-wide: toggle DeveloperSettings.searchLoggingEnabled
 * via the AI Search → Developer panel in the admin control panel.
 */
import { prisma } from "@/lib/prisma";

export interface SearchLogPayload {
  userId: string;
  rawQuery: string;
  expandedQuery?: string | null;
  detectedLanguage?: string | null;
  inferredTags?: Array<{ tagSlug: string; confidence: string }> | null;
  selectedTagFilters?: string[];
  resultVideoIds?: string[];
  resultCount?: number;
  searchMethod?: "semantic" | "keyword";
  durationMs?: number;
}

let _loggingEnabled: boolean | null = null;
let _cacheExpiry = 0;
const CACHE_TTL_MS = 60_000; // re-read toggle at most once per minute

async function isLoggingEnabled(): Promise<boolean> {
  const now = Date.now();
  if (_loggingEnabled !== null && now < _cacheExpiry) return _loggingEnabled;
  try {
    const settings = await prisma.developerSettings.findUnique({ where: { id: "default" } });
    _loggingEnabled = settings?.searchLoggingEnabled ?? true;
    _cacheExpiry = now + CACHE_TTL_MS;
  } catch {
    _loggingEnabled = true; // default to on if DB read fails
  }
  return _loggingEnabled;
}

export function logSearchQuery(payload: SearchLogPayload): void {
  // Intentionally NOT awaited — this must never slow down the search response.
  (async () => {
    try {
      if (!(await isLoggingEnabled())) return;
      await prisma.searchQueryLog.create({
        data: {
          userId: payload.userId,
          rawQuery: payload.rawQuery,
          expandedQuery: payload.expandedQuery ?? null,
          detectedLanguage: payload.detectedLanguage ?? null,
          inferredTags: payload.inferredTags ? (payload.inferredTags as any) : undefined,
          selectedTagFilters: payload.selectedTagFilters ?? [],
          resultVideoIds: payload.resultVideoIds ?? [],
          resultCount: payload.resultCount ?? 0,
          searchMethod: payload.searchMethod ?? "keyword",
          durationMs: payload.durationMs ?? null,
        },
      });
    } catch {
      // Silently swallow — search logging must never affect the user experience.
    }
  })();
}
