#!/bin/bash

# Video Editing Features - Migration Script
# This script applies the database migration for the new video editing fields

echo "🎬 Applying Video Editing Features Migration..."
echo ""

cd "$(dirname "$0")"

# Check if PostgreSQL is running
if ! nc -z localhost 5434 2>/dev/null; then
    echo "❌ Error: PostgreSQL is not running on port 5434"
    echo "Please start your database server first."
    exit 1
fi

echo "✅ Database connection verified"
echo ""

# Apply migration
echo "📦 Applying migration..."
npx prisma migrate deploy

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration applied successfully!"
    echo ""
    echo "The following fields have been added to the VideoClip table:"
    echo "  - trimStart (Float)"
    echo "  - trimEnd (Float)"
    echo "  - cutSegments (JSON)"
    echo "  - loopZoneStart (Float)"
    echo "  - loopZoneEnd (Float)"
    echo ""
    echo "🎉 Video editing features are now ready to use!"
else
    echo ""
    echo "❌ Migration failed. Please check the error above."
    exit 1
fi
