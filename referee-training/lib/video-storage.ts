import { put } from "@vercel/blob";
import { mkdir, writeFile } from "fs/promises";
import { join, posix } from "path";
import { randomUUID } from "crypto";

const UPLOAD_PREFIX = "videos/uploads";

function sanitizeFileName(name: string) {
  const sanitized = name.replace(/[^a-zA-Z0-9.-]/g, "_");
  return sanitized || "upload";
}

function shouldUseBlobStorage() {
  return (
    process.env.NODE_ENV === "production" ||
    Boolean(process.env.BLOB_READ_WRITE_TOKEN) ||
    Boolean(process.env.VERCEL_OIDC_TOKEN)
  );
}

function createUploadPath(file: File, subdirectory?: string) {
  const fileName = `${Date.now()}-${randomUUID()}-${sanitizeFileName(file.name)}`;
  return posix.join(UPLOAD_PREFIX, subdirectory ?? "", fileName);
}

export async function storeVideoAsset(file: File, subdirectory?: string) {
  const pathname = createUploadPath(file, subdirectory);

  if (shouldUseBlobStorage()) {
    const blob = await put(pathname, file, {
      access: "public",
      contentType: file.type || undefined,
    });
    return blob.url;
  }

  const segments = pathname.split("/");
  const fileName = segments.pop();
  if (!fileName) {
    throw new Error("Invalid upload path.");
  }

  const uploadDir = join(process.cwd(), "public", ...segments);
  await mkdir(uploadDir, { recursive: true });

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  await writeFile(join(uploadDir, fileName), fileBuffer);

  return `/${pathname}`;
}
