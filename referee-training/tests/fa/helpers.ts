/**
 * Shared constants + helpers for the FA (federation) Playwright suite.
 *
 * Everything created by this suite is prefixed "PWFA" / "pwfa-" so fixtures
 * are unmistakably test data and can be re-created idempotently without ever
 * touching real rows.
 */
import fs from "fs";
import path from "path";
import type { APIRequestContext, PlaywrightWorkerArgs } from "@playwright/test";

type Playwright = PlaywrightWorkerArgs["playwright"];

export const BASE_URL = "http://localhost:3000";

/**
 * Playwright does not load Next's .env files, but lib/prisma requires
 * DATABASE_URL at import time. Minimal parser; .env.local wins over .env,
 * pre-existing process env wins over both.
 */
export function loadEnv() {
  const root = path.join(__dirname, "..", "..");
  for (const file of [".env.local", ".env"]) {
    const full = path.join(root, file);
    if (!fs.existsSync(full)) continue;
    for (const line of fs.readFileSync(full, "utf8").split("\n")) {
      const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const [, key, raw] = match;
      if (process.env[key] !== undefined) continue;
      let value = raw.trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}

export const PW = {
  password: "PwfaTest123!",
  users: {
    super: "pwfa-super@test.local",
    adminAlpha: "pwfa-admin-alpha@test.local",
    adminBeta: "pwfa-admin-beta@test.local",
    adminNoFa: "pwfa-admin-nofa@test.local",
    refAlpha: "pwfa-ref-alpha@test.local",
    refBeta: "pwfa-ref-beta@test.local",
    refNoFa: "pwfa-ref-nofa@test.local",
  },
  fas: {
    alpha: "PWFA Alpha FA",
    beta: "PWFA Beta FA",
  },
  ranks: {
    alphaElite: "PWFA Alpha Elite",
    alphaFirst: "PWFA Alpha First",
    betaElite: "PWFA Beta Elite",
    betaFirst: "PWFA Beta First",
  },
  content: {
    globalQuestion: "PWFA GLOBAL QUESTION (ifab, visible to everyone)",
    alphaQuestion: "PWFA ALPHA QUESTION (custom, Alpha FA only)",
    betaQuestion: "PWFA BETA QUESTION (custom, Beta FA only)",
    globalMandatoryTest: "PWFA Global Mandatory Test",
    alphaMandatoryTest: "PWFA Alpha Mandatory Test",
    betaMandatoryTest: "PWFA Beta Mandatory Test",
    globalPoolTest: "PWFA Global Pool Test",
    alphaPoolTest: "PWFA Alpha Pool Test",
    betaPoolTest: "PWFA Beta Pool Test",
    globalClip: "PWFA Global Clip",
    alphaClip: "PWFA Alpha Clip",
    betaClip: "PWFA Beta Clip",
    globalVideoPool: "PWFA Global Video Pool",
    alphaVideoPool: "PWFA Alpha Video Pool",
    betaVideoPool: "PWFA Beta Video Pool",
    globalVideoMandatory: "PWFA Global Video Mandatory",
    alphaVideoMandatory: "PWFA Alpha Video Mandatory",
    betaVideoMandatory: "PWFA Beta Video Mandatory",
  },
} as const;

const AUTH_DIR = path.join(__dirname, "..", "..", "playwright", ".auth");

export function statePath(who: keyof typeof PW.users): string {
  return path.join(AUTH_DIR, `pwfa-${who}.json`);
}

/** IDs of fixture rows, written by fixtures.setup.ts and read by the specs. */
const IDS_FILE = path.join(AUTH_DIR, "pwfa-ids.json");

export type FixtureIds = {
  alphaFaId: string;
  betaFaId: string;
  alphaEliteRankId: string;
  alphaFirstRankId: string;
  betaEliteRankId: string;
  uefaPanelId: string;
  fifaPanelId: string;
  refAlphaId: string;
  refBetaId: string;
  refNoFaId: string;
  adminAlphaId: string;
  globalQuestionId: string;
  alphaQuestionId: string;
  betaQuestionId: string;
  betaClipId: string;
  alphaClipId: string;
  globalClipId: string;
};

export function writeFixtureIds(ids: FixtureIds) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  fs.writeFileSync(IDS_FILE, JSON.stringify(ids, null, 2));
}

export function readFixtureIds(): FixtureIds {
  return JSON.parse(fs.readFileSync(IDS_FILE, "utf8"));
}

/** New API context authenticated as one of the fixture users. */
export async function apiAs(
  playwright: Playwright,
  who: keyof typeof PW.users
): Promise<APIRequestContext> {
  return playwright.request.newContext({
    baseURL: BASE_URL,
    storageState: statePath(who),
  });
}

/** New API context with no cookies at all. */
export async function apiAnon(playwright: Playwright): Promise<APIRequestContext> {
  // Explicit empty state: newContext() would otherwise inherit the project's
  // default storageState (the super admin) from the Playwright config.
  return playwright.request.newContext({
    baseURL: BASE_URL,
    storageState: { cookies: [], origins: [] },
  });
}

/** Log a user in via the NextAuth credentials callback and persist the state. */
export async function loginAndSave(
  playwright: Playwright,
  email: string,
  file: string
) {
  const ctx = await playwright.request.newContext({ baseURL: BASE_URL });
  const csrfRes = await ctx.get("/api/auth/csrf");
  const { csrfToken } = await csrfRes.json();
  const login = await ctx.post("/api/auth/callback/credentials", {
    form: {
      email,
      password: PW.password,
      csrfToken,
      callbackUrl: BASE_URL,
      json: "true",
    },
  });
  if (!login.ok()) {
    throw new Error(`Credentials login failed for ${email}: ${login.status()}`);
  }
  const session = await (await ctx.get("/api/auth/session")).json();
  if (session?.user?.email !== email) {
    throw new Error(
      `Session check failed for ${email}; got ${JSON.stringify(session?.user ?? null)}`
    );
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await ctx.storageState({ path: file });
  await ctx.dispose();
}
