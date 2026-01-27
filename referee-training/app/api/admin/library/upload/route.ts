import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { uploadVideo, createEditedVideoFromPublicId, VideoEditPayload } from '@/lib/cloudinary';

// Route segment config - increase timeout for large video uploads
export const maxDuration = 600; // 10 minutes in seconds

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
    const editDataRaw = formData.get('editData');
    let editData: VideoEditPayload | null = null;
    if (typeof editDataRaw === 'string') {
      try {
        editData = JSON.parse(editDataRaw);
      } catch {
        editData = null;
      }
    }
    
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

    let finalResult = result;
    const hasRequestedEdits = !!editData && (
      (Number(editData.trimStart) || 0) > 0 ||
      (Number.isFinite(editData.trimEnd) && result.duration && (editData.trimEnd as number) < (result.duration - 0.001))
    );

    let calculatedDuration = result.duration || 0;
    
    if (editData && hasRequestedEdits) {
      try {
        console.log('🎬 Attempting to create edited video:', {
          publicId: result.public_id,
          duration: result.duration,
          editData,
          hasRequestedEdits,
        });
        
        const edited = await createEditedVideoFromPublicId(result.public_id, editData, result.duration);
        
        console.log('🎬 Edit result:', edited ? 'success' : 'null');
        
        if (!edited) {
          throw new Error('Edit requested but no edited asset was produced');
        }
        
        finalResult = edited;
        
        // Calculate the expected trimmed duration from the edit data
        // Cloudinary's eager transformation response doesn't include duration,
        // so we compute it ourselves from the trim values
        if (result.duration) {
          const trimStart = Math.max(0, Number(editData.trimStart) || 0);
          const trimEnd = Number.isFinite(editData.trimEnd) 
            ? Math.min(editData.trimEnd as number, result.duration)
            : result.duration;
          calculatedDuration = Math.max(0, trimEnd - trimStart);
          
          console.log('📐 Duration calculation:', {
            originalDuration: result.duration,
            trimStart,
            trimEnd,
            calculatedDuration,
            cloudinaryDuration: edited.duration,
          });
        }
      } catch (error) {
        console.error('❌ Failed to create edited video:', error);
        return NextResponse.json(
          { error: 'Failed to apply edits to uploaded video' },
          { status: 500 }
        );
      }
    }

    // Use Cloudinary's duration if available and reasonable, otherwise use calculated
    const finalDuration = (finalResult.duration && finalResult.duration > 0) 
      ? finalResult.duration 
      : calculatedDuration;

    return NextResponse.json({
      success: true,
      video: {
        url: finalResult.secure_url,
        thumbnailUrl: finalResult.thumbnail_url,
        publicId: finalResult.public_id,
        duration: finalDuration,
        format: finalResult.format,
        bytes: finalResult.bytes,
      },
    });
  } catch (error: any) {
    console.error('❌ Error uploading video:', error);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      error: error,
    });
    
    // Return detailed error in development
    const errorMessage = error?.message || 'Failed to upload video';
    const errorDetails = process.env.NODE_ENV === 'development' 
      ? {
          message: error?.message,
          stack: error?.stack,
          name: error?.name,
          code: error?.code,
        }
      : undefined;
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails,
      },
      { status: 500 }
    );
  }
}

