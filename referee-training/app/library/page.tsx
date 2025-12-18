import Link from "next/link";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import type { Category, LibraryArticle } from "@prisma/client";

export const revalidate = 60;

export default async function LibraryPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams.q ?? "";
  let articles: (LibraryArticle & { category: Category | null })[] = [];
  try {
    articles = await prisma.libraryArticle.findMany({
      where: q ? { title: { contains: q, mode: "insensitive" } } : {},
      include: { category: true },
      orderBy: { order: "asc" },
    });
  } catch {
    articles = [];
  }

  return (
    <div className="mx-auto max-w-screen-xl px-6 py-10 space-y-8">
      {/* Header */}
      <div>
        <div className="w-12 h-1 bg-gradient-to-r from-warm to-cyan-500 rounded-full mb-4" />
        <h1 className="text-3xl font-bold text-premium">Video Library</h1>
        <p className="mt-2 text-text-secondary">
          Conceptual guides for Handball, Offside, DOGSO/SPA, Simulation, and more
        </p>
      </div>

      {/* Search */}
      <form className="flex gap-3" action="/library" method="get">
        <div className="relative flex-1">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            name="q"
            defaultValue={q}
            placeholder="Search topics..."
            className="w-full h-12 pl-12 pr-4 rounded-lg bg-dark-800 border border-dark-500 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
          />
        </div>
        <button
          type="submit"
          className="h-12 px-6 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 text-dark-900 font-semibold hover:from-cyan-400 hover:to-cyan-500 transition-all shadow-glow hover:shadow-glow-strong"
        >
          Search
        </button>
      </form>

      {/* Articles Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {articles.length === 0 ? (
          <Card className="col-span-full">
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-dark-700 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-text-secondary mb-4">
                {q ? `No articles found for "${q}"` : "No articles yet. Add content in the Super Admin console."}
              </p>
              {q && (
                <Link href="/library" className="text-cyan-500 hover:text-cyan-400 font-medium">
                  Clear search
                </Link>
              )}
            </div>
          </Card>
        ) : (
          articles.map((article) => (
            <Link key={article.id} href={`/library/${article.slug}`} className="group">
              <Card hoverable className="h-full">
                <p className="text-xs uppercase tracking-widest text-cyan-500 mb-2">
                  {article.category?.name ?? "Topic"}
                </p>
                <h3 className="text-lg font-semibold text-text-primary group-hover:text-cyan-500 transition-colors">
                  {article.title}
                </h3>
                <div className="mt-4 flex items-center gap-2 text-text-secondary text-sm group-hover:text-cyan-500 transition-colors">
                  Read article
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
