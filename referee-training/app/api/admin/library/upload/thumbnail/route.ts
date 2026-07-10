import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * POST /api/admin/library/upload/thumbnail
 * Upload custom thumbnail image to Cloudinary
 * Requires SUPER_ADMIN role
 */
export async function POST(request: Request) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const formData = await request.formData();
    const file = formData.get('thumbnail') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No thumbnail file provided' },
        { status: 400 }
      );
    }

    // Convert File to base64 for Cloudinary upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${file.type};base64,${buffer.toString('base64')}`;

    // Upload to Cloudinary as image
    const result = await cloudinary.uploader.upload(base64, {
      folder: 'referee-training/thumbnails',
      tags: ['thumbnail', 'referee', 'training'],
      resource_type: 'image',
      transformation: [
        { width: 1280, height: 720, crop: 'fill', quality: 'auto' }
      ],
    });

    return NextResponse.json({
      success: true,
      thumbnailUrl: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
    });
  } catch (error) {
    console.error('Error uploading thumbnail:', error);
    return NextResponse.json(
      { error: 'Failed to upload thumbnail' },
      { status: 500 }
    );
  }
}
