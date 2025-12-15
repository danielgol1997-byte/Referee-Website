import * as React from "react";
import { cn } from "@/lib/utils";

type VideoPlayerProps = React.VideoHTMLAttributes<HTMLVideoElement> & {
  source: string;
  poster?: string;
};

export function VideoPlayer({ source, poster, className, ...props }: VideoPlayerProps) {
  return (
    <div className={cn("w-full overflow-hidden rounded-uefa-lg bg-black shadow-uefa-elevated", className)}>
      <video
        className="h-full w-full"
        controls
        poster={poster}
        preload="metadata"
        {...props}
      >
        <source src={source} />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}

