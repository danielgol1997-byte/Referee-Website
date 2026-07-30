const { spawnSync } = require("node:child_process");

if (!process.env.DIRECT_DATABASE_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_DATABASE_URL = process.env.DATABASE_URL;
}

const result = spawnSync("prisma", ["generate"], {
  env: process.env,
  shell: process.platform === "win32",
  stdio: "inherit",
});

process.exit(result.status ?? 1);
