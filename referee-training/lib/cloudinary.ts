/**
 * Cloudinary Video Upload & Management Utilities
 * 
 * Handles video uploads, thumbnail generation, and URL optimization
 * for the UEFA Referee Training Video Library.
 */

import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary (server-side only)
if (typeof window === 'undefined') {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  format: string;
  resource_type: string;
  duration?: number; // in seconds (for videos)
  width?: number;
  height?: number;
  bytes: number;
  thumbnail_url?: string;
}

export interface VideoUploadOptions {
  folder?: string;
  tags?: string[];
  context?: Record<string, string>;
}

/**
 * Upload a video to Cloudinary
 * Server-side only
 * 
 * @param file - File path or data URI
 * @param options - Upload options
 * @returns Upload result with URLs and metadata
 */
export async function uploadVideo(
  file: string,
  options: VideoUploadOptions = {}
): Promise<CloudinaryUploadResult> {
  const {
    folder = 'referee-training/videos',
    tags = [],
    context = {},
  } = options;

  try {
    console.log('🔄 Cloudinary config check:', {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME ? '✅ Set' : '❌ Missing',
      apiKey: process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Missing',
      apiSecret: process.env.CLOUDINARY_API_SECRET ? '✅ Set' : '❌ Missing',
    });

    console.log('📤 Starting Cloudinary upload...');
    
    const result = await cloudinary.uploader.upload(file, {
      resource_type: 'video',
      folder,
      tags,
      context,
      // Video-specific options
      format: 'mp4',
      // Auto-generate thumbnail at 2 seconds
      eager: [
        {
          width: 1280,
          height: 720,
          crop: 'fill',
          quality: 'auto',
          format: 'jpg',
          start_offset: '2',
        },
      ],
      eager_async: false,
    });

    console.log('✅ Cloudinary upload complete:', result.public_id);

    // Get thumbnail URL from eager transformation
    const thumbnailUrl = result.eager?.[0]?.secure_url || 
                        result.secure_url.replace(/\.(mp4|mov|avi)$/, '.jpg');

    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      url: result.url,
      format: result.format,
      resource_type: result.resource_type,
      duration: result.duration,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      thumbnail_url: thumbnailUrl,
    };
  } catch (error: any) {
    console.error('❌ Cloudinary upload error:', error);
    console.error('Full error object:', JSON.stringify(error, null, 2));
    console.error('Error details:', {
      message: error?.message,
      error: error?.error,
      http_code: error?.http_code,
      name: error?.name,
      stack: error?.stack,
    });
    
    // Provide specific error messages based on common issues
    let errorMessage = 'Unknown error';
    
    if (error?.message) {
      errorMessage = error.message;
    } else if (error?.error?.message) {
      errorMessage = error.error.message;
    }
    
    // Check for common Cloudinary errors
    if (errorMessage.includes('Invalid cloud_name')) {
      errorMessage = 'Invalid Cloudinary cloud name. Please check CLOUDINARY_CLOUD_NAME in .env';
    } else if (errorMessage.includes('Invalid API key')) {
      errorMessage = 'Invalid Cloudinary API key. Please check CLOUDINARY_API_KEY in .env';
    } else if (errorMessage.includes('Invalid signature') || errorMessage.includes('authentication')) {
      errorMessage = 'Invalid Cloudinary API secret. Please check CLOUDINARY_API_SECRET in .env';
    } else if (error?.http_code === 401) {
      errorMessage = 'Cloudinary authentication failed. Please verify your credentials in .env';
    } else if (error?.http_code === 400) {
      errorMessage = `Invalid video file or upload parameters. Cloudinary error: ${error?.message || JSON.stringify(error?.error || error)}`;
    }
    
    throw new Error(`Failed to upload video: ${errorMessage}`);
  }
}

/**
 * Delete a video from Cloudinary
 * Server-side only
 * 
 * @param publicId - Cloudinary public ID
 */
export async function deleteVideo(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: 'video',
      invalidate: true, // Clear CDN cache
    });
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error(`Failed to delete video: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate optimized video URL with transformations
 * Client-safe
 * 
 * @param publicId - Cloudinary public ID
 * @param options - Transformation options
 * @returns Optimized video URL
 */
export function getVideoUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    quality?: 'auto' | 'best' | 'good' | 'eco' | 'low';
    format?: 'mp4' | 'webm';
  } = {}
): string {
  const {
    width,
    height,
    quality = 'auto',
    format = 'mp4',
  } = options;

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 
                   process.env.CLOUDINARY_CLOUD_NAME;

  if (!cloudName) {
    throw new Error('Cloudinary cloud name not configured');
  }

  const transformations: string[] = [];

  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  if (quality) transformations.push(`q_${quality}`);
  if (format) transformations.push(`f_${format}`);

  const transformStr = transformations.join(',');
  const basePath = transformStr ? `${cloudName}/video/upload/${transformStr}` : `${cloudName}/video/upload`;

  return `https://res.cloudinary.com/${basePath}/${publicId}`;
}

/**
 * Generate thumbnail URL for a video
 * Client-safe
 * 
 * @param publicId - Cloudinary public ID (without extension)
 * @param options - Thumbnail options
 * @returns Thumbnail image URL
 */
export function getThumbnailUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    startOffset?: string; // e.g., "2" for 2 seconds into video
  } = {}
): string {
  const {
    width = 1280,
    height = 720,
    startOffset = '2',
  } = options;

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 
                   process.env.CLOUDINARY_CLOUD_NAME;

  if (!cloudName) {
    throw new Error('Cloudinary cloud name not configured');
  }

  const transforms = [
    `w_${width}`,
    `h_${height}`,
    'c_fill',
    'q_auto',
    'f_jpg',
    `so_${startOffset}`,
  ].join(',');

  return `https://res.cloudinary.com/${cloudName}/video/upload/${transforms}/${publicId}.jpg`;
}

/**
 * Client-side upload configuration
 * Returns safe configuration for client-side uploads using unsigned preset
 */
export function getClientUploadConfig() {
  return {
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 
              process.env.CLOUDINARY_CLOUD_NAME,
    uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 
                  process.env.CLOUDINARY_UPLOAD_PRESET ||
                  'referee_videos',
    apiKey: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY ||
            process.env.CLOUDINARY_API_KEY,
  };
}

/**
 * Extract public ID from Cloudinary URL
 * 
 * @param url - Cloudinary URL
 * @returns Public ID
 */
export function extractPublicId(url: string): string | null {
  try {
    const matches = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
    return matches?.[1] || null;
  } catch {
    return null;
  }
}

/**
 * Validate video file
 * Client-side validation
 * 
 * @param file - File object
 * @returns Validation result
 */
export function validateVideoFile(file: File): {
  valid: boolean;
  error?: string;
} {
  const MAX_SIZE = 100 * 1024 * 1024; // 100MB
  const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload MP4, MOV, AVI, or WebM files.',
    };
  }

  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      error: `File size exceeds 100MB limit. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`,
    };
  }

  return { valid: true };
}
