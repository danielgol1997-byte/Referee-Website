import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";

type Section = {
  title?: string;
  bullets?: string[];
  paragraphs?: string[];
};

export default async function LibraryArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const article = await prisma.libraryArticle.findUnique({
    where: { slug: resolvedParams.slug },
    include: { category: true },
  });

  if (!article) return notFound();

  const content = (article.content as { sections?: Section[] }) ?? {};

  return (
    <div className="mx-auto max-w-screen-md px-6 py-10 space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.12em] text-neutrals-textOnLightSecondary">
          {article.category?.name ?? "Library"}
        </p>
        <h1 className="text-3xl font-bold text-neutrals-textOnLightPrimary">{article.title}</h1>
      </div>

      {content.sections?.length ? (
        <div className="space-y-4">
          {content.sections.map((section, idx) => (
            <Card key={idx} className="space-y-3">
              {section.title ? (
                <h3 className="text-lg font-semibold text-neutrals-textOnLightPrimary">
                  {section.title}
                </h3>
              ) : null}
              {section.paragraphs?.length ? (
                <div className="space-y-2 text-sm text-neutrals-textOnLightSecondary">
                  {section.paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              ) : null}
              {section.bullets?.length ? (
                <ul className="list-disc space-y-2 pl-5 text-sm text-neutrals-textOnLightSecondary">
                  {section.bullets.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <p className="text-neutrals-textOnLightSecondary">
            This article has no structured content yet.
          </p>
        </Card>
      )}
    </div>
  );
}

