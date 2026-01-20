import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { uploadVideo, getThumbnailUrl } from '@/lib/cloudinary';

/**
 * POST /api/admin/library/upload
 * Upload video to Cloudinary
 * Requires SUPER_ADMIN role
 */
export async function POST(request: Request) {
  try {
    console.log('📹 Video upload request received');
    
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== 'SUPER_ADMIN') {
      console.error('❌ Unauthorized upload attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ User authorized:', session.user.email);

    const formData = await request.formData();
    const file = formData.get('video') as File;
    
    if (!file) {
      console.error('❌ No video file in request');
      return NextResponse.json(
        { error: 'No video file provided' },
        { status: 400 }
      );
    }

    console.log('📁 File received:', file.name, 'Type:', file.type, 'Size:', file.size, '(' + (file.size / 1024 / 1024).toFixed(2) + 'MB)');

    // Check for Cloudinary credentials
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.error('❌ Cloudinary credentials missing');
      return NextResponse.json(
        { error: 'Cloudinary credentials not configured. Please check .env file.' },
        { status: 500 }
      );
    }

    console.log('✅ Cloudinary credentials found:', {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecretSet: !!process.env.CLOUDINARY_API_SECRET,
    });

    // Validate file size (50MB limit for base64)
    const MAX_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_SIZE) {
      console.error('❌ File too large:', file.size);
      return NextResponse.json(
        { error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds 50MB limit` },
        { status: 400 }
      );
    }

    console.log('🔄 Converting file to base64...');
    
    // Convert File to base64 for Cloudinary upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${file.type};base64,${buffer.toString('base64')}`;

    console.log('✅ File converted to base64, length:', base64.length);
    console.log('🔄 Uploading to Cloudinary...');

    // Upload to Cloudinary
    const result = await uploadVideo(base64, {
      folder: 'referee-training/videos',
      tags: ['referee', 'training'],
    });

    console.log('✅ Upload successful:', result.public_id);

    return NextResponse.json({
      success: true,
      video: {
        url: result.secure_url,
        thumbnailUrl: result.thumbnail_url,
        publicId: result.public_id,
        duration: result.duration,
        format: result.format,
        bytes: result.bytes,
      },
    });
  } catch (error: any) {
    console.error('❌ Error uploading video:', error);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    return NextResponse.json(
      { 
        error: error?.message || 'Failed to upload video',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}

