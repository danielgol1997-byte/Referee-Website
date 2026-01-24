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
const tagCategoryResult = spawnSync('node', ['prisma/migrate-tag-categories.js'], {
  stdio: 'inherit',
});

if (tagCategoryResult.status !== 0) {
  console.error('Tag Category migration failed!');
  process.exit(tagCategoryResult.status ?? 1);
}

console.log('\nRunning Laws to Tags migration for production...');
const lawsResult = spawnSync('node', ['prisma/migrate-laws-to-tags.js'], {
  stdio: 'inherit',
});

process.exit(lawsResult.status ?? 1);
