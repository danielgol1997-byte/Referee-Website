#!/bin/bash
# Vercel deployment script
# Usage: ./scripts/deploy.sh [production|preview]
# Requires: VERCEL_TOKEN environment variable (or set in .env.local)

set -e

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PARENT_DIR="$(cd "$PROJECT_DIR/.." && pwd)"

# Load .env.local if it exists
if [ -f "$PROJECT_DIR/.env.local" ]; then
  export $(cat "$PROJECT_DIR/.env.local" | grep -v '^#' | xargs)
fi

# Check for Vercel token
if [ -z "$VERCEL_TOKEN" ]; then
  echo "❌ Error: VERCEL_TOKEN environment variable is not set"
  echo "   Set it in .env.local or export it: export VERCEL_TOKEN=your_token"
  exit 1
fi

# Determine deployment type
DEPLOY_TYPE="${1:-production}"

if [ "$DEPLOY_TYPE" = "production" ]; then
  echo "🚀 Deploying to PRODUCTION..."
  DEPLOY_FLAG="--prod"
else
  echo "🚀 Deploying to PREVIEW..."
  DEPLOY_FLAG=""
fi

# Deploy from parent directory (Vercel project root is configured to referee-training subdirectory)
cd "$PARENT_DIR"
npx -y vercel deploy $DEPLOY_FLAG --cwd "$PROJECT_DIR" --token "$VERCEL_TOKEN" --yes

echo "✅ Deployment complete!"
