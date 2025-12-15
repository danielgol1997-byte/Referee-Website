import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LawSnippetsCarousel } from "@/components/LawSnippetsCarousel";

export default async function LawsPage() {
  let articles = [];
  try {
    articles = await prisma.libraryArticle.findMany({
      where: { category: { type: "LOTG" } },
      include: { category: true },
      orderBy: { order: "asc" },
    });
  } catch {
    articles = [];
  }

  return (
    <div className="mx-auto max-w-screen-xl px-6 py-10 space-y-8">
      {/* Hero Card with Liquid Glass Effect */}
      <div className="relative overflow-hidden rounded-xl backdrop-blur-xl bg-dark-700/40 border border-accent/20 shadow-lg 
                      hover:border-accent/30 transition-all duration-500 hover:shadow-[0_0_30px_rgba(232,224,154,0.15)]">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-accent/10 animate-pulse" 
             style={{ animationDuration: '4s' }} />
        
        {/* Shimmer effect */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_8s_ease-in-out_infinite] 
                          bg-gradient-to-r from-transparent via-white/3 to-transparent" />
        </div>

        <div className="relative p-6">
          <p className="text-sm uppercase tracking-widest text-accent/80 mb-2">
            Laws of the Game
          </p>
          <h1 className="text-3xl font-bold text-text-primary">
            Master the IFAB Laws
          </h1>
          <p className="mt-3 text-text-secondary max-w-2xl">
            Test your knowledge with real match scenarios and access official resources.
          </p>
          
          {/* Main CTA */}
          <div className="mt-8 flex flex-wrap gap-4">
            <Button asChild size="xl" className="shadow-lg hover:text-dark-900 hover:scale-105 hover:shadow-[0_0_25px_rgba(232,224,154,0.4)] transition-all duration-300">
              <Link href="/laws/test" className="text-dark-900">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Start LOTG Test
              </Link>
            </Button>
            
            <Button 
              asChild 
              size="xl" 
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-lg hover:scale-105 hover:shadow-[0_0_25px_rgba(0,232,248,0.4)] transition-all duration-300"
            >
              <Link href="/laws/study">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Study
              </Link>
            </Button>
          </div>

          {/* Official Resources */}
          <div className="mt-8 pt-6 border-t border-accent/10">
            <p className="text-sm text-text-secondary mb-4">Official IFAB Resources</p>
            <div className="flex flex-wrap gap-3">
              <Button 
                asChild 
                variant="outline" 
                size="sm"
                className="group"
              >
                <a 
                  href="https://www.theifab.com/laws/latest/the-field-of-play/#field-surface" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  Browse Laws Online
                  <svg className="w-3 h-3 opacity-60 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </Button>
              
              <Button 
                asChild 
                variant="outline" 
                size="sm"
                className="group"
              >
                <a 
                  href="https://downloads.theifab.com/downloads/laws-of-the-game-2025-26-double-pages?l=en" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download PDF
                  <svg className="w-3 h-3 opacity-60 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
      </div>

      {/* Laws Grid */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Study by Law</h2>
          <p className="text-sm text-text-secondary mt-1">Review detailed explanations for each law</p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {articles.length === 0 ? (
            <div className="col-span-full">
              <LawSnippetsCarousel />
            </div>
          ) : (
            articles.map((article) => (
              <Link key={article.id} href={`/library/${article.slug}`} className="group">
                <Card hoverable className="h-full space-y-3">
                  <h3 className="text-lg font-semibold text-text-primary group-hover:text-accent transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-sm text-text-secondary line-clamp-2">
                    {article.category?.description ?? "Law content"}
                  </p>
                  <div className="flex items-center gap-2 text-accent text-sm font-medium">
                    Read article
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
