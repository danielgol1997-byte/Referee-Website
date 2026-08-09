import { join, resolve, sep } from "path";

const VIDEO_UPLOAD_ROOT = join(process.cwd(), ".uploads", "videos");

export function sanitizeUploadFileName(name: string) {
  const sanitized = name.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `${Date.now()}-${sanitized || "upload"}`;
}

export function getVideoUploadDir() {
  return VIDEO_UPLOAD_ROOT;
}

export function getThumbnailUploadDir() {
  return join(VIDEO_UPLOAD_ROOT, "thumbnails");
}

export function getVideoUploadPath(fileName: string) {
  return join(getVideoUploadDir(), fileName);
}

export function getThumbnailUploadPath(fileName: string) {
  return join(getThumbnailUploadDir(), fileName);
}

export function getVideoMediaUrl(fileName: string) {
  return `/api/library/videos/media/${encodeURIComponent(fileName)}`;
}

export function getThumbnailMediaUrl(fileName: string) {
  return `/api/library/videos/media/thumbnails/${encodeURIComponent(fileName)}`;
}

function isSafeSegment(segment: string) {
  return (
    segment.length > 0 &&
    segment !== "." &&
    segment !== ".." &&
    !segment.includes("/") &&
    !segment.includes("\\")
  );
}

export function resolveVideoMediaPath(segments: string[]) {
  if (
    segments.length === 0 ||
    segments.length > 2 ||
    !segments.every(isSafeSegment) ||
    (segments.length === 2 && segments[0] !== "thumbnails")
  ) {
    return null;
  }

  const root = resolve(VIDEO_UPLOAD_ROOT);
  const filePath = resolve(root, ...segments);

  if (filePath !== root && filePath.startsWith(`${root}${sep}`)) {
    return filePath;
  }

  return null;
}
