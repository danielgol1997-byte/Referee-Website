const { spawnSync } = require('child_process');

function shouldRunMigration() {
  // Only run on Vercel production builds to avoid unintended local/preview runs
  return process.env.VERCEL === '1' && process.env.VERCEL_ENV === 'production';
}

if (!shouldRunMigration()) {
  console.log('Skipping Tag Category migration (not a Vercel production build).');
  process.exit(0);
}

console.log('Running Tag Category migration for production...');
const result = spawnSync('node', ['prisma/migrate-tag-categories.js'], {
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
