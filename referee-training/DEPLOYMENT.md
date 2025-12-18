# Deployment Guide

## Vercel Token Setup

The Vercel deployment token is stored in `.env.local` (gitignored) and is accessible across all branches.

### Initial Setup

1. Copy the example file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and add your Vercel token:
   ```
   VERCEL_TOKEN=your_actual_token_here
   ```

### Deploying

**Option 1: Using npm scripts (recommended)**
```bash
# Deploy to production
npm run deploy

# Deploy to preview
npm run deploy:preview
```

**Option 2: Using the script directly**
```bash
# Production
./scripts/deploy.sh production

# Preview
./scripts/deploy.sh preview
```

**Option 3: Manual deployment**
```bash
# Load token from .env.local
export $(cat .env.local | grep VERCEL_TOKEN | xargs)

# Deploy
cd ..
npx vercel deploy --prod --cwd referee-training --token $VERCEL_TOKEN --yes
```

### Token Access Across Branches

The `.env.local` file is gitignored, so:
- ✅ The token stays local to your machine
- ✅ Works on any branch automatically
- ✅ Never gets committed to git
- ✅ Each developer can have their own token

If you switch branches and the token isn't working, make sure `.env.local` exists in the `referee-training/` directory.
