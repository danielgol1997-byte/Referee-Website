import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createEditedVideoFromPublicId, VideoEditPayload } from '@/lib/cloudinary';

// Route segment config - increase timeout for video transformations
// Note: Vercel limits are 10s (Hobby), 60s (Pro), 300s (Pro with Edge), 900s (Enterprise)
export const maxDuration = 60; // 60 seconds for Pro plan, 10 for Hobby

interface EditRequestBody {
  publicId: string;
  duration?: number;
  editData: VideoEditPayload;
}

/**
 * POST /api/admin/library/upload/edit
 * Create edited (trim/cut) video from Cloudinary public ID
 * Requires SUPER_ADMIN role
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as EditRequestBody;
    const { publicId, duration, editData } = body;

    if (!publicId || !editData) {
      return NextResponse.json(
        { error: 'Missing required fields: publicId, editData' },
        { status: 400 }
      );
    }

    const hasRequestedEdits = (
      (Number(editData.trimStart) || 0) > 0 ||
      (Number.isFinite(editData.trimEnd) && Number.isFinite(duration) && duration && (editData.trimEnd as number) < (duration - 0.001))
    );

    const edited = await createEditedVideoFromPublicId(publicId, editData, duration);

    if (!edited && hasRequestedEdits) {
      return NextResponse.json(
        { error: 'Edit requested but no edited asset was produced' },
        { status: 500 }
      );
    }

    if (!edited) {
      return NextResponse.json({ edited: false }, { status: 200 });
    }

    // Calculate the expected trimmed duration from the edit data
    // Cloudinary's eager transformation response doesn't always include duration,
    // so we compute it ourselves from the trim values
    let calculatedDuration = edited.duration || 0;
    if (duration && hasRequestedEdits) {
      const trimStart = Math.max(0, Number(editData.trimStart) || 0);
      const trimEnd = Number.isFinite(editData.trimEnd) 
        ? Math.min(editData.trimEnd as number, duration)
        : duration;
      calculatedDuration = Math.max(0, trimEnd - trimStart);
      
      console.log('📐 Edit API - Duration calculation:', {
        originalDuration: duration,
        trimStart,
        trimEnd,
        calculatedDuration,
        cloudinaryDuration: edited.duration,
      });
    }

    return NextResponse.json({
      edited: true,
      video: {
        url: edited.secure_url,
        thumbnailUrl: edited.thumbnail_url,
        publicId: edited.public_id,
        duration: edited.duration || calculatedDuration || 0,
        format: edited.format,
        bytes: edited.bytes,
      },
    });
  } catch (error: any) {
    console.error('❌ Error creating edited video:', error);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      error: error,
    });
    
    // Return detailed error in development
    const errorMessage = error?.message || 'Failed to create edited video';
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
