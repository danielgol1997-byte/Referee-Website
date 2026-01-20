# Video Upload Fix - Foreign Key Constraint Error

## Issue
Video upload was failing with error:
```
Foreign key constraint violated: `VideoClip_uploadedById_fkey (index)`
```

## Root Cause
The `uploadedById` field in `VideoClip` references a user ID from the session, but that user doesn't exist in the database. This can happen when:
1. The user authenticates via NextAuth
2. The session is created with a user ID
3. But the User record was never properly created in the database

## Solution
Updated `/app/api/admin/library/videos/route.ts` to:

1. **Check if user exists** before creating video:
```typescript
const userExists = await prisma.user.findUnique({
  where: { id: session.user.id },
});

if (!userExists) {
  console.warn('⚠️ User not found in database, creating video without uploadedById:', session.user.id);
}
```

2. **Conditionally set uploadedById**:
```typescript
uploadedById: userExists ? session.user.id : null, // Only set if user exists
```

3. **Added logging** to track user authorization:
```typescript
console.log('✅ User authorized:', session.user.email, 'ID:', session.user.id);
```

## Benefits
- ✅ Videos can now be uploaded even if user record is missing
- ✅ Graceful degradation - video is created without uploader reference
- ✅ Better logging to debug authentication issues
- ✅ No breaking changes - existing functionality preserved

## Schema
The `uploadedById` field is already optional in the schema:
```prisma
model VideoClip {
  uploadedById String?
  uploadedBy   User?   @relation(fields: [uploadedById], references: [id])
  // ...
}
```

## Next Steps for User
1. **Try uploading a video again** - it should now work
2. **Check if super@example.com user exists** in the database
3. **If user is missing**, you may need to:
   - Run the seed script to create the super admin user
   - Or manually create the user in Prisma Studio
   - Or fix the authentication flow to properly create users

## Testing
- [x] Build compiles successfully
- [x] User existence check implemented
- [x] Graceful fallback to null uploadedById
- [x] Enhanced logging for debugging

## Related Files
- `/app/api/admin/library/videos/route.ts` - Video creation API
- `/prisma/schema.prisma` - Database schema
