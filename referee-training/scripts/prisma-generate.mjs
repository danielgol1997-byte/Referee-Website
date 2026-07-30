import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

if (!process.env.DIRECT_DATABASE_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_DATABASE_URL = process.env.DATABASE_URL;
}

const prismaPackageUrl = import.meta.resolve("prisma/package.json");
const prismaCli = join(dirname(fileURLToPath(prismaPackageUrl)), "build/index.js");
const result = spawnSync(process.execPath, [prismaCli, "generate"], {
  env: process.env,
  stdio: "inherit",
});

if (result.error) {
  console.error(`Failed to run Prisma generate: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
