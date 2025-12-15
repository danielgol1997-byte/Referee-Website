import { TestRunner } from "@/components/test/test-runner";

export default async function PracticeSessionPage({
  params,
}: {
  params: Promise<{ category: string; sessionId: string }>;
}) {
  const resolvedParams = await params;
  return (
    <div className="mx-auto max-w-screen-md px-6 py-10">
      <TestRunner
        sessionId={resolvedParams.sessionId}
        resultsHref={`/practice/${resolvedParams.category}/${resolvedParams.sessionId}/results`}
      />
    </div>
  );
}

