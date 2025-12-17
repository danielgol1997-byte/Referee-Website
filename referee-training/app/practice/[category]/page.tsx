import { prisma } from "@/lib/prisma";
import { TestStarter } from "@/components/test/test-starter";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function PracticeCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const resolvedParams = await params;
  const slug = resolvedParams.category;
  const category = await prisma.category.findUnique({ where: { slug } });

  return (
    <div className="mx-auto max-w-screen-md px-6 py-10 space-y-4">
      <Card className="space-y-3">
        <p className="text-sm uppercase tracking-[0.12em] text-neutrals-textOnLightSecondary">
          {category?.name ?? slug} – Video challenge
        </p>
        <h1 className="text-2xl font-bold text-neutrals-textOnLightPrimary">
          Watch the clip, choose the correct decision, and see the explanation.
        </h1>
        <p className="text-neutrals-textOnLightSecondary">
          10 questions per practice. You&apos;ll receive the correct answer after each clip and a final score at the end.
        </p>
        <TestStarter
          endpoint="/api/tests/start"
          redirectBase={`/practice/${slug}`}
          payload={{
            categorySlug: slug,
            type: "VIDEO_CHALLENGE",
          }}
        />
      </Card>
    </div>
  );
}

