/**
 * Client-safe Cloudinary helpers (no Node-only imports).
 */

export function getClientUploadConfig() {
  return {
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "",
    uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "",
    apiKey: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || "",
  };
}

export function getThumbnailUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    startOffset?: string;
  } = {}
): string {
  const {
    width = 1280,
    height = 720,
    startOffset = "2",
  } = options;

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
  if (!cloudName) {
    throw new Error("Cloudinary cloud name not configured for client uploads");
  }

  const transforms = [
    `w_${width}`,
    `h_${height}`,
    "c_fill",
    "q_auto",
    "f_jpg",
    `so_${startOffset}`,
  ].join(",");

  return `https://res.cloudinary.com/${cloudName}/video/upload/${transforms}/${publicId}.jpg`;
}

/**
 * Upload video directly to Cloudinary from client
 */
export async function uploadVideoClient(file: File, uploadPreset: string, cloudName: string): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  formData.append('resource_type', 'video');

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudinary video upload failed: ${errorText}`);
  }

  return response.json();
}

/**
 * Upload image (thumbnail) directly to Cloudinary from client
 */
export async function uploadImageClient(file: File, uploadPreset: string, cloudName: string): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  formData.append('resource_type', 'image');
  formData.append('folder', 'referee-training/thumbnails');

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudinary image upload failed: ${errorText}`);
  }

  return response.json();
}