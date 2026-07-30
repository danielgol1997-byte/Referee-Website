const { spawnSync } = require("node:child_process");

if (!process.env.DIRECT_DATABASE_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_DATABASE_URL = process.env.DATABASE_URL;
}

const prismaCli = require.resolve("prisma/build/index.js");
const result = spawnSync(process.execPath, [prismaCli, "generate"], {
  env: process.env,
  stdio: "inherit",
});

if (result.error) {
  console.error(`Failed to run Prisma generate: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
