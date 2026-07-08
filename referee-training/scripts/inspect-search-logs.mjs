/** One-off: inspect recent search query logs + video/embedding coverage. */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.searchQueryLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  console.log(`=== Last ${logs.length} search logs ===\n`);
  for (const log of logs) {
    console.log(`[${log.createdAt.toISOString()}] "${log.rawQuery}"`);
    console.log(`  method: ${log.searchMethod}, results: ${log.resultCount}, duration: ${log.durationMs}ms`);
    console.log(`  expandedQuery: ${(log.expandedQuery || "").slice(0, 200)}`);
    console.log(`  inferredTags: ${JSON.stringify(log.inferredTags)}`);
    console.log(`  selectedTagFilters: ${JSON.stringify(log.selectedTagFilters)}`);
    console.log(`  resultVideoIds: ${log.resultVideoIds.length}`);
    console.log("");
  }

  // Coverage stats
  const total = await prisma.videoClip.count({ where: { isActive: true } });
  const approved = await prisma.videoClip.count({
    where: { isActive: true, searchDescriptionStatus: "approved" },
  });
  const byStatus = await prisma.videoClip.groupBy({
    by: ["searchDescriptionStatus"],
    _count: true,
  });
  const embedded = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS n FROM "VideoClip" WHERE "embedding" IS NOT NULL`
  );
  const embeddedActive = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS n FROM "VideoClip" WHERE "embedding" IS NOT NULL AND "isActive" = true`
  );
  console.log(`=== Coverage ===`);
  console.log(`Active videos: ${total}, approved: ${approved}`);
  console.log(`Status breakdown: ${JSON.stringify(byStatus.map((s) => ({ [s.searchDescriptionStatus]: s._count })))}`);
  console.log(`Embedded (all): ${embedded[0].n}, embedded (active): ${embeddedActive[0].n}`);

  // Educational split
  const edu = await prisma.videoClip.count({ where: { isActive: true, isEducational: true } });
  console.log(`Educational (explanation) active videos: ${edu} of ${total}`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
