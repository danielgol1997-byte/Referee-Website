import { TestSummary } from "@/components/test/test-summary";

export default async function ArResultsPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const resolvedParams = await params;
  return (
    <div className="mx-auto max-w-screen-md px-6 py-10">
      <TestSummary sessionId={resolvedParams.sessionId} restartHref="/practice/ar" />
    </div>
  );
}

