# Cloudinary Credentials - PERMANENT REFERENCE

## CRITICAL: DO NOT DELETE THIS FILE

This file contains the Cloudinary credentials for the Video Library feature.
These credentials are stored in `.env` (gitignored) but are documented here for reference.

## Credentials

```
Cloud Name: dh9glizf2
API Key: 758219945737749
API Secret: [Check .env file or Cloudinary dashboard]
```

## Setup Instructions

### 1. Local Development

Add to your `.env` file:

```env
CLOUDINARY_CLOUD_NAME=dh9glizf2
CLOUDINARY_API_KEY=758219945737749
CLOUDINARY_API_SECRET=your_api_secret_from_cloudinary_dashboard
CLOUDINARY_UPLOAD_PRESET=referee_videos
```

### 2. Production (Vercel)

Add to Vercel environment variables:

```bash
vercel env add CLOUDINARY_CLOUD_NAME
# Enter: dh9glizf2

vercel env add CLOUDINARY_API_KEY
# Enter: 758219945737749

vercel env add CLOUDINARY_API_SECRET
# Enter: your_api_secret_from_cloudinary_dashboard

vercel env add CLOUDINARY_UPLOAD_PRESET
# Enter: referee_videos
```

### 3. Cloudinary Upload Preset Setup

1. Log in to Cloudinary dashboard: https://cloudinary.com/console
2. Navigate to Settings → Upload
3. Create new upload preset named: `referee_videos`
4. Configuration:
   - Signing Mode: **Unsigned** (for client-side uploads)
   - Folder: `referee-training/videos`
   - Format: `mp4`
   - Video codec: `h264`
   - Quality: `auto`
   - Resource type: `video`
   - Auto-generate thumbnails: **Yes**
   - Thumbnail transformation: `w_1280,h_720,c_fill,q_auto`

## Getting API Secret

If you need to retrieve the API secret:

1. Go to Cloudinary Console: https://cloudinary.com/console
2. Navigate to Dashboard
3. Look for "Account Details" section
4. Copy the "API Secret" value

## Branch Consistency

This file is committed to git and will be available across all branches.
The actual credentials in `.env` are gitignored for security.

## Notes

- **Cloud Name**: `dh9glizf2` (public, used in URLs)
- **API Key**: `758219945737749` (public, used for uploads)
- **API Secret**: Kept in `.env`, NEVER commit to git
- **Free Tier**: 25 GB storage, 25 GB bandwidth/month
- **Recommended**: Monitor usage in Cloudinary dashboard

## Support

- Cloudinary Documentation: https://cloudinary.com/documentation
- Video Upload Guide: https://cloudinary.com/documentation/video_manipulation_and_delivery
- Next.js Integration: https://cloudinary.com/documentation/react_integration

---

**Last Updated**: December 18, 2025
**Status**: ✅ ACTIVE
**Owner**: Daniel
