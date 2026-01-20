import { VideoSearchView } from "@/components/library/VideoSearchView";

export const revalidate = 300;

export default async function VideoSearchPage() {
  return <VideoSearchView />;
}
