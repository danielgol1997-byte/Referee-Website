import { ArTestSummary } from "@/components/practice/ar/ArTestSummary";

type PageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function ArResultsPage({ params }: PageProps) {
  const { sessionId } = await params;
  return (
    <div className="mx-auto max-w-screen-xl px-6 py-10">
      <ArTestSummary sessionId={sessionId} restartHref="/practice/ar" />
    </div>
  );
}
