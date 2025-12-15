import { TestSummary } from "@/components/test/test-summary";

export default async function LawsTestResultsPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const resolvedParams = await params;
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <TestSummary sessionId={resolvedParams.sessionId} />
    </div>
  );
}

