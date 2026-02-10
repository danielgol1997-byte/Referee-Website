import { VideoTestSummary } from "@/components/practice/VideoTestSummary";

type PageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function VideoTestResultsPage({ params }: PageProps) {
  const { sessionId } = await params;
  return (
    <div className="mx-auto max-w-screen-xl px-6 py-10">
      <VideoTestSummary sessionId={sessionId} restartHref="/practice/video-tests" />
    </div>
  );
}
