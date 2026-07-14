import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Category } from "@prisma/client";

export const dynamic = "force-dynamic";

type PracticeCategory = Pick<Category, "id" | "name" | "slug" | "type">;

const categoryIcons: Record<string, React.ReactNode> = {
  offside: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
    </svg>
  ),
  handball: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
    </svg>
  ),
  default: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export default async function PracticePage() {
  let categories: PracticeCategory[] = [];
  try {
    categories = await prisma.category.findMany({
      where: { type: "CHALLENGE" },
      orderBy: { order: "asc" },
      select: { id: true, name: true, slug: true, type: true },
    });
  } catch {
    categories = [];
  }

  const fallback: PracticeCategory[] = [
    { id: "offside", name: "Offside", slug: "offside", type: "CHALLENGE" },
    { id: "handball", name: "Handball", slug: "handball", type: "CHALLENGE" },
    { id: "dogso-spa", name: "DOGSO/SPA", slug: "dogso-spa", type: "CHALLENGE" },
    { id: "simulation", name: "Simulation", slug: "simulation", type: "CHALLENGE" },
    { id: "teamwork", name: "Teamwork", slug: "teamwork", type: "CHALLENGE" },
    { id: "dissent", name: "Dissent", slug: "dissent", type: "CHALLENGE" },
    { id: "pai", name: "PAI", slug: "pai", type: "CHALLENGE" },
    { id: "laws-of-the-game", name: "Laws of the game", slug: "laws-of-the-game", type: "CHALLENGE" },
  ];

  return (
    <div className="mx-auto max-w-screen-xl px-6 py-10 space-y-8">
      {/* Hero Card */}
      <Card variant="accent" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent" />
        <div className="relative">
          <p className="text-sm uppercase tracking-widest text-cyan-500 mb-2">
            Referees practice
          </p>
          <h1 className="text-3xl font-bold text-premium">
            Video challenges by category
          </h1>
          <p className="mt-3 text-text-secondary max-w-2xl">
            Answer with the correct decision and see the explanation after each clip. 
            Finish the set and view your score.
          </p>
        </div>
      </Card>

      {/* Categories Grid */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Categories</h2>
          <p className="text-sm text-text-secondary mt-1">Choose a topic to start a 10-clip challenge</p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {(categories.length ? categories : fallback).map((category) => (
            <Link 
              key={category.id} 
              href={`/practice/${category.slug}`}
              className="group"
            >
              <Card hoverable className="h-full flex flex-col">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-dark-600 flex items-center justify-center text-cyan-500 group-hover:bg-cyan-500/20 transition-colors">
                    {categoryIcons[category.slug] || categoryIcons.default}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-text-primary group-hover:text-cyan-500 transition-colors">
                      {category.name}
                    </h3>
                    <p className="text-sm text-text-secondary mt-1">
                      10-question challenge with video explanations
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-dark-600 flex items-center justify-between">
                  <span className="text-xs text-text-muted">10 clips per session</span>
                  <span className="text-cyan-500 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Access */}
      <Card className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-text-primary">Looking for other training types?</h3>
          <p className="text-sm text-text-secondary">Try VAR or Assistant Referee specific modules</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" asChild>
            <Link href="/practice/var">VAR Practice</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/practice/ar">A.R. Practice</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
