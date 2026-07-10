/**
 * Per-federation data division — API level.
 *
 * Pedantic checks that every scoped endpoint returns exactly the right rows
 * for: an FA admin (own FA + global), an admin from another FA, an admin with
 * no FA, referees of each FA, a referee with no FA, a super admin (everything)
 * and anonymous callers.
 */
import { test, expect, type APIRequestContext } from "@playwright/test";
import { apiAs, apiAnon, readFixtureIds, PW, type FixtureIds } from "./helpers";

let ids: FixtureIds;
let superApi: APIRequestContext;
let adminAlpha: APIRequestContext;
let adminBeta: APIRequestContext;
let adminNoFa: APIRequestContext;
let refAlpha: APIRequestContext;
let refBeta: APIRequestContext;
let refNoFa: APIRequestContext;
let anon: APIRequestContext;

test.beforeAll(async ({ playwright }) => {
  ids = readFixtureIds();
  [superApi, adminAlpha, adminBeta, adminNoFa, refAlpha, refBeta, refNoFa, anon] =
    await Promise.all([
      apiAs(playwright, "super"),
      apiAs(playwright, "adminAlpha"),
      apiAs(playwright, "adminBeta"),
      apiAs(playwright, "adminNoFa"),
      apiAs(playwright, "refAlpha"),
      apiAs(playwright, "refBeta"),
      apiAs(playwright, "refNoFa"),
      apiAnon(playwright),
    ]);
});

test.afterAll(async () => {
  await Promise.all(
    [superApi, adminAlpha, adminBeta, adminNoFa, refAlpha, refBeta, refNoFa, anon]
      .filter(Boolean)
      .map((c) => c.dispose())
  );
});

/* ------------------------------------------------------------------ */
/* /api/admin/referees                                                 */
/* ------------------------------------------------------------------ */
test.describe("referee listing division", () => {
  test("alpha admin sees only alpha referees", async () => {
    const res = await adminAlpha.get("/api/admin/referees");
    expect(res.status()).toBe(200);
    const { referees } = await res.json();
    const emails = referees.map((r: { email: string }) => r.email);
    expect(emails).toContain(PW.users.refAlpha);
    expect(emails).not.toContain(PW.users.refBeta);
    expect(emails).not.toContain(PW.users.refNoFa);
    for (const r of referees) {
      expect(r.associationId).toBe(ids.alphaFaId);
    }
  });

  test("beta admin sees only beta referees", async () => {
    const { referees } = await (await adminBeta.get("/api/admin/referees")).json();
    const emails = referees.map((r: { email: string }) => r.email);
    expect(emails).toContain(PW.users.refBeta);
    expect(emails).not.toContain(PW.users.refAlpha);
  });

  test("alpha admin cannot break out via super-admin query params", async () => {
    const res = await adminAlpha.get(
      `/api/admin/referees?associationId=${ids.betaFaId}&unassigned=true`
    );
    expect(res.status()).toBe(200);
    const { referees } = await res.json();
    const emails = referees.map((r: { email: string }) => r.email);
    expect(emails).not.toContain(PW.users.refBeta);
    expect(emails).not.toContain(PW.users.refNoFa);
    for (const r of referees) expect(r.associationId).toBe(ids.alphaFaId);
  });

  test("admin without an FA sees an empty list", async () => {
    const { referees } = await (await adminNoFa.get("/api/admin/referees")).json();
    expect(referees).toEqual([]);
  });

  test("super admin sees everyone and can filter", async () => {
    const all = await (await superApi.get("/api/admin/referees")).json();
    const allEmails = all.referees.map((r: { email: string }) => r.email);
    expect(allEmails).toContain(PW.users.refAlpha);
    expect(allEmails).toContain(PW.users.refBeta);
    expect(allEmails).toContain(PW.users.refNoFa);

    const beta = await (
      await superApi.get(`/api/admin/referees?associationId=${ids.betaFaId}`)
    ).json();
    for (const r of beta.referees) expect(r.associationId).toBe(ids.betaFaId);
    expect(beta.referees.map((r: { email: string }) => r.email)).toContain(PW.users.refBeta);

    const unassigned = await (
      await superApi.get("/api/admin/referees?unassigned=true")
    ).json();
    for (const r of unassigned.referees) expect(r.associationId).toBeNull();
    expect(unassigned.referees.map((r: { email: string }) => r.email)).toContain(
      PW.users.refNoFa
    );
  });

  test("referees and anonymous callers are rejected", async () => {
    expect((await refAlpha.get("/api/admin/referees")).status()).toBe(403);
    expect((await anon.get("/api/admin/referees")).status()).toBe(401);
  });
});

/* ------------------------------------------------------------------ */
/* /api/admin/users/[id] — rank / panel assignment permissions         */
/* ------------------------------------------------------------------ */
test.describe("rank assignment permissions", () => {
  test("alpha admin can rank an alpha referee with an alpha rank", async () => {
    const res = await adminAlpha.patch(`/api/admin/users/${ids.refAlphaId}`, {
      data: { rankId: ids.alphaEliteRankId },
    });
    expect(res.status()).toBe(200);
    const { user } = await res.json();
    expect(user.rank?.name).toBe(PW.ranks.alphaElite);
  });

  test("alpha admin cannot use a rank from another FA", async () => {
    const res = await adminAlpha.patch(`/api/admin/users/${ids.refAlphaId}`, {
      data: { rankId: ids.betaEliteRankId },
    });
    expect(res.status()).toBe(400);
  });

  test("alpha admin cannot touch a referee from another FA", async () => {
    const res = await adminAlpha.patch(`/api/admin/users/${ids.refBetaId}`, {
      data: { rankId: ids.betaEliteRankId },
    });
    expect(res.status()).toBe(403);
  });

  test("alpha admin cannot change role, status, or association", async () => {
    for (const data of [
      { role: "ADMIN" },
      { isActive: false },
      { associationId: ids.betaFaId },
      { profileComplete: false },
    ]) {
      const res = await adminAlpha.patch(`/api/admin/users/${ids.refAlphaId}`, { data });
      expect(res.status(), `payload ${JSON.stringify(data)} must be rejected`).toBe(403);
    }
  });

  test("alpha admin can assign an international federation + category", async () => {
    const fed = await adminAlpha.patch(`/api/admin/users/${ids.refAlphaId}`, {
      data: { internationalAssociationId: ids.intlFedId },
    });
    expect(fed.status()).toBe(200);
    expect((await fed.json()).user.internationalAssociation?.name).toBe(PW.fas.intl);

    const cat = await adminAlpha.patch(`/api/admin/users/${ids.refAlphaId}`, {
      data: { internationalRankId: ids.intlEliteCategoryId },
    });
    expect(cat.status()).toBe(200);
    expect((await cat.json()).user.internationalRank?.name).toBe(PW.ranks.intlElite);
  });

  test("changing the international federation resets the category", async () => {
    const res = await adminAlpha.patch(`/api/admin/users/${ids.refAlphaId}`, {
      data: { internationalAssociationId: null },
    });
    expect(res.status()).toBe(200);
    const { user } = await res.json();
    expect(user.internationalAssociation).toBeNull();
    expect(user.internationalRank).toBeNull();

    // Re-assign for the following tests.
    await adminAlpha.patch(`/api/admin/users/${ids.refAlphaId}`, {
      data: { internationalAssociationId: ids.intlFedId, internationalRankId: ids.intlEliteCategoryId },
    });
  });

  test("a national FA is rejected as an international federation", async () => {
    const res = await adminAlpha.patch(`/api/admin/users/${ids.refAlphaId}`, {
      data: { internationalAssociationId: ids.alphaFaId },
    });
    expect(res.status()).toBe(400);
  });

  test("an FA rank is rejected as an international category", async () => {
    const res = await adminAlpha.patch(`/api/admin/users/${ids.refAlphaId}`, {
      data: { internationalRankId: ids.alphaEliteRankId },
    });
    expect(res.status()).toBe(400);
  });

  test("a category cannot be set without an international federation", async () => {
    const res = await adminAlpha.patch(`/api/admin/users/${ids.refAlphaId}`, {
      data: { internationalAssociationId: null, internationalRankId: ids.intlEliteCategoryId },
    });
    expect(res.status()).toBe(400);
  });

  test("clearing rank and international federation works", async () => {
    const res = await adminAlpha.patch(`/api/admin/users/${ids.refAlphaId}`, {
      data: { rankId: null, internationalAssociationId: null, internationalRankId: null },
    });
    expect(res.status()).toBe(200);
    const { user } = await res.json();
    expect(user.rank).toBeNull();
    expect(user.internationalAssociation).toBeNull();
    expect(user.internationalRank).toBeNull();
  });

  test("referees and anonymous callers cannot patch users", async () => {
    expect(
      (
        await refAlpha.patch(`/api/admin/users/${ids.refAlphaId}`, {
          data: { rankId: ids.alphaEliteRankId },
        })
      ).status()
    ).toBe(401);
    expect(
      (
        await anon.patch(`/api/admin/users/${ids.refAlphaId}`, {
          data: { rankId: ids.alphaEliteRankId },
        })
      ).status()
    ).toBe(401);
  });
});

/* ------------------------------------------------------------------ */
/* Hierarchy management guards (associations + ranks)                  */
/* ------------------------------------------------------------------ */
test.describe("hierarchy management is super-admin only", () => {
  test("association CRUD is closed to FA admins and referees", async () => {
    expect((await adminAlpha.get("/api/admin/associations")).status()).toBe(403);
    expect((await refAlpha.get("/api/admin/associations")).status()).toBe(403);
    expect((await anon.get("/api/admin/associations")).status()).toBe(401);

    expect(
      (
        await adminAlpha.post("/api/admin/associations", {
          data: { name: "PWFA Sneaky FA" },
        })
      ).status()
    ).toBe(403);
    expect(
      (
        await adminAlpha.patch(`/api/admin/associations/${ids.alphaFaId}`, {
          data: { name: "PWFA Hijacked" },
        })
      ).status()
    ).toBe(403);
    expect(
      (await adminAlpha.delete(`/api/admin/associations/${ids.betaFaId}`)).status()
    ).toBe(403);
  });

  test("rank creation is closed to FA admins", async () => {
    const res = await adminAlpha.post("/api/admin/ranks", {
      data: { name: "PWFA Sneaky Rank", associationId: ids.alphaFaId },
    });
    expect(res.status()).toBe(403);
  });

  test("FA admin rank reads are locked to their own FA", async () => {
    const own = await (await adminAlpha.get("/api/admin/ranks")).json();
    expect(own.ranks.length).toBeGreaterThan(0);
    for (const rank of own.ranks) expect(rank.associationId).toBe(ids.alphaFaId);

    // Requesting another FA's ranks must not leak them.
    const cross = await (
      await adminAlpha.get(`/api/admin/ranks?associationId=${ids.betaFaId}`)
    ).json();
    for (const rank of cross.ranks) expect(rank.associationId).toBe(ids.alphaFaId);

    // International categories are readable by FA admins (needed to assign
    // referees), and every returned rank belongs to an international federation.
    const intl = await (await adminAlpha.get("/api/admin/ranks?international=true")).json();
    const names = intl.ranks.map((r: { name: string }) => r.name);
    expect(names).toContain(PW.ranks.intlElite);
    for (const rank of intl.ranks) {
      expect(rank.association?.isInternational).toBe(true);
      expect(rank.associationId).not.toBe(ids.alphaFaId);
    }
  });

  test("international federation catalogue is readable by FA admins", async () => {
    const res = await adminAlpha.get("/api/admin/associations?international=true");
    expect(res.status()).toBe(200);
    const { associations } = await res.json();
    const fed = associations.find((a: { name: string }) => a.name === PW.fas.intl);
    expect(fed).toBeTruthy();
    expect(fed.isInternational).toBe(true);
    const rankNames = fed.ranks.map((r: { name: string }) => r.name);
    expect(rankNames).toContain(PW.ranks.intlElite);
    expect(rankNames).toContain(PW.ranks.intlFirst);
    // Only international federations may leak to FA admins here.
    for (const a of associations) expect(a.isInternational).toBe(true);
  });

  test("deleting an FA with members is blocked even for super admins", async () => {
    const res = await superApi.delete(`/api/admin/associations/${ids.alphaFaId}`);
    expect(res.status()).toBe(400);
    const { error } = await res.json();
    expect(error).toMatch(/referee/i);
  });

  test("public association list requires login and shows active FAs", async () => {
    expect((await anon.get("/api/associations")).status()).toBe(401);
    const { associations } = await (await refNoFa.get("/api/associations")).json();
    const names = associations.map((a: { name: string }) => a.name);
    expect(names).toContain(PW.fas.alpha);
    expect(names).toContain(PW.fas.beta);
    // International federations are admin-assigned, never self-selected.
    expect(names).not.toContain(PW.fas.intl);
  });
});

/* ------------------------------------------------------------------ */
/* Admin question division                                             */
/* ------------------------------------------------------------------ */
test.describe("question division (admin)", () => {
  test("alpha admin sees global + alpha questions, never beta", async () => {
    const { questions } = await (
      await adminAlpha.get("/api/admin/questions?categorySlug=laws-of-the-game")
    ).json();
    const texts = questions.map((q: { text: string }) => q.text);
    expect(texts).toContain(PW.content.globalQuestion);
    expect(texts).toContain(PW.content.alphaQuestion);
    expect(texts).not.toContain(PW.content.betaQuestion);
  });

  test("super admin sees questions from every FA", async () => {
    const { questions } = await (
      await superApi.get("/api/admin/questions?categorySlug=laws-of-the-game")
    ).json();
    const texts = questions.map((q: { text: string }) => q.text);
    expect(texts).toContain(PW.content.globalQuestion);
    expect(texts).toContain(PW.content.alphaQuestion);
    expect(texts).toContain(PW.content.betaQuestion);
  });

  test("question count respects the FA scope", async () => {
    const alphaCount = (
      await (await adminAlpha.get("/api/admin/questions/count?categorySlug=laws-of-the-game")).json()
    ).count;
    const betaCount = (
      await (await adminBeta.get("/api/admin/questions/count?categorySlug=laws-of-the-game")).json()
    ).count;
    const superCount = (
      await (await superApi.get("/api/admin/questions/count?categorySlug=laws-of-the-game")).json()
    ).count;
    // Each FA admin counts global + exactly one PWFA scoped question; the
    // super admin additionally counts the other FA's question.
    expect(alphaCount).toBe(betaCount);
    expect(superCount).toBe(alphaCount + 1);
  });

  test("FA admin authored questions are stamped with their FA and forced non-IFAB", async () => {
    const res = await adminAlpha.post("/api/admin/questions", {
      data: {
        type: "LOTG_TEXT",
        categorySlug: "laws-of-the-game",
        text: "PWFA ALPHA AUTHORED QUESTION (temp)",
        explanation: "temp",
        isIfab: true, // must be ignored for FA admins
        answerOptions: [
          { label: "A", isCorrect: true },
          { label: "B", isCorrect: false },
        ],
      },
    });
    expect(res.status()).toBe(201);
    const { question } = await res.json();
    expect(question.associationId).toBe(ids.alphaFaId);
    expect(question.isIfab).toBe(false);

    // The author can edit and delete their own FA question…
    const patch = await adminAlpha.patch(`/api/admin/questions/${question.id}`, {
      data: { text: "PWFA ALPHA AUTHORED QUESTION (edited)" },
    });
    expect(patch.status()).toBe(200);

    // …but the beta admin cannot see or touch it.
    expect(
      (
        await adminBeta.patch(`/api/admin/questions/${question.id}`, {
          data: { text: "PWFA hijack" },
        })
      ).status()
    ).toBe(403);

    const del = await adminAlpha.delete(`/api/admin/questions/${question.id}`);
    expect(del.status()).toBe(200);
  });

  test("FA admin cannot modify global or foreign questions", async () => {
    expect(
      (
        await adminAlpha.patch(`/api/admin/questions/${ids.globalQuestionId}`, {
          data: { text: "PWFA GLOBAL hijack" },
        })
      ).status()
    ).toBe(403);
    expect(
      (
        await adminAlpha.patch(`/api/admin/questions/${ids.betaQuestionId}`, {
          data: { text: "PWFA BETA hijack" },
        })
      ).status()
    ).toBe(403);
    expect(
      (await adminAlpha.delete(`/api/admin/questions/${ids.betaQuestionId}`)).status()
    ).toBe(403);
    expect(
      (await adminAlpha.delete(`/api/admin/questions/${ids.globalQuestionId}`)).status()
    ).toBe(403);
  });

  test("admin without an FA cannot author questions", async () => {
    const res = await adminNoFa.post("/api/admin/questions", {
      data: {
        type: "LOTG_TEXT",
        categorySlug: "laws-of-the-game",
        text: "PWFA NOFA QUESTION (should fail)",
        explanation: "temp",
      },
    });
    expect(res.status()).toBe(400);
  });
});

/* ------------------------------------------------------------------ */
/* Admin test + library division                                       */
/* ------------------------------------------------------------------ */
test.describe("laws tests, video tests, and library division (admin)", () => {
  test("alpha admin: laws tests list has global + alpha, never beta", async () => {
    const { tests } = await (await adminAlpha.get("/api/admin/mandatory-tests")).json();
    const titles = tests.map((t: { title: string }) => t.title);
    expect(titles).toContain(PW.content.globalMandatoryTest);
    expect(titles).toContain(PW.content.alphaMandatoryTest);
    expect(titles).toContain(PW.content.alphaPoolTest);
    expect(titles).not.toContain(PW.content.betaMandatoryTest);
    expect(titles).not.toContain(PW.content.betaPoolTest);
  });

  test("super admin: laws tests list has every FA", async () => {
    const { tests } = await (await superApi.get("/api/admin/mandatory-tests")).json();
    const titles = tests.map((t: { title: string }) => t.title);
    expect(titles).toContain(PW.content.alphaMandatoryTest);
    expect(titles).toContain(PW.content.betaMandatoryTest);
  });

  test("alpha admin: video tests list has global + alpha, never beta", async () => {
    const { tests } = await (await adminAlpha.get("/api/admin/video-tests")).json();
    const names = tests.map((t: { name: string }) => t.name);
    expect(names).toContain(PW.content.globalVideoPool);
    expect(names).toContain(PW.content.alphaVideoPool);
    expect(names).toContain(PW.content.alphaVideoMandatory);
    expect(names).not.toContain(PW.content.betaVideoPool);
    expect(names).not.toContain(PW.content.betaVideoMandatory);
  });

  test("alpha admin: library videos have global + alpha, never beta", async () => {
    const { videos } = await (
      await adminAlpha.get("/api/admin/library/videos?search=PWFA")
    ).json();
    const titles = videos.map((v: { title: string }) => v.title);
    expect(titles).toContain(PW.content.globalClip);
    expect(titles).toContain(PW.content.alphaClip);
    expect(titles).not.toContain(PW.content.betaClip);
  });

  test("super admin: library search sees every FA's videos", async () => {
    const { videos } = await (
      await superApi.get("/api/admin/library/videos?search=PWFA")
    ).json();
    const titles = videos.map((v: { title: string }) => v.title);
    expect(titles).toContain(PW.content.alphaClip);
    expect(titles).toContain(PW.content.betaClip);
  });

  test("referee cannot reach any admin content endpoint", async () => {
    for (const url of [
      "/api/admin/mandatory-tests",
      "/api/admin/video-tests",
      "/api/admin/library/videos",
      "/api/admin/questions?categorySlug=laws-of-the-game",
    ]) {
      const res = await refAlpha.get(url);
      expect([401, 403], `${url} must reject referees`).toContain(res.status());
    }
  });
});

/* ------------------------------------------------------------------ */
/* Referee-facing content division                                     */
/* ------------------------------------------------------------------ */
test.describe("referee-facing content division", () => {
  test("laws mandatory tests: alpha referee gets global + alpha only", async () => {
    const { tests } = await (await refAlpha.get("/api/tests/laws/mandatory")).json();
    const titles = tests.map((t: { title: string }) => t.title);
    expect(titles).toContain(PW.content.globalMandatoryTest);
    expect(titles).toContain(PW.content.alphaMandatoryTest);
    expect(titles).not.toContain(PW.content.betaMandatoryTest);
  });

  test("laws mandatory tests: beta referee gets global + beta only", async () => {
    const { tests } = await (await refBeta.get("/api/tests/laws/mandatory")).json();
    const titles = tests.map((t: { title: string }) => t.title);
    expect(titles).toContain(PW.content.betaMandatoryTest);
    expect(titles).not.toContain(PW.content.alphaMandatoryTest);
  });

  test("laws mandatory tests: referee without FA gets global only", async () => {
    const { tests } = await (await refNoFa.get("/api/tests/laws/mandatory")).json();
    const titles = tests.map((t: { title: string }) => t.title);
    expect(titles).toContain(PW.content.globalMandatoryTest);
    expect(titles).not.toContain(PW.content.alphaMandatoryTest);
    expect(titles).not.toContain(PW.content.betaMandatoryTest);
  });

  test("laws pool tests are scoped the same way", async () => {
    const alpha = await (await refAlpha.get("/api/tests/laws/pool")).json();
    const alphaTitles = alpha.tests.map((t: { title: string }) => t.title);
    expect(alphaTitles).toContain(PW.content.globalPoolTest);
    expect(alphaTitles).toContain(PW.content.alphaPoolTest);
    expect(alphaTitles).not.toContain(PW.content.betaPoolTest);

    const none = await (await refNoFa.get("/api/tests/laws/pool")).json();
    const noneTitles = none.tests.map((t: { title: string }) => t.title);
    expect(noneTitles).toContain(PW.content.globalPoolTest);
    expect(noneTitles).not.toContain(PW.content.alphaPoolTest);
    expect(noneTitles).not.toContain(PW.content.betaPoolTest);
  });

  test("video mandatory tests are scoped", async () => {
    const { tests } = await (await refAlpha.get("/api/tests/videos/mandatory")).json();
    const names = tests.map((t: { name: string }) => t.name);
    expect(names).toContain(PW.content.globalVideoMandatory);
    expect(names).toContain(PW.content.alphaVideoMandatory);
    expect(names).not.toContain(PW.content.betaVideoMandatory);
  });

  test("video pool tests are scoped", async () => {
    const data = await (await refAlpha.get("/api/tests/videos/pool")).json();
    const names = data.public.map((t: { name: string }) => t.name);
    expect(names).toContain(PW.content.globalVideoPool);
    expect(names).toContain(PW.content.alphaVideoPool);
    expect(names).not.toContain(PW.content.betaVideoPool);
  });

  test("library keyword search is scoped per referee", async () => {
    const alpha = await (await refAlpha.get("/api/library/videos/search?q=PWFA")).json();
    const alphaTitles = alpha.videos.map((v: { title: string }) => v.title);
    expect(alphaTitles).toContain(PW.content.globalClip);
    expect(alphaTitles).toContain(PW.content.alphaClip);
    expect(alphaTitles).not.toContain(PW.content.betaClip);

    const beta = await (await refBeta.get("/api/library/videos/search?q=PWFA")).json();
    const betaTitles = beta.videos.map((v: { title: string }) => v.title);
    expect(betaTitles).toContain(PW.content.globalClip);
    expect(betaTitles).toContain(PW.content.betaClip);
    expect(betaTitles).not.toContain(PW.content.alphaClip);

    const none = await (await refNoFa.get("/api/library/videos/search?q=PWFA")).json();
    const noneTitles = none.videos.map((v: { title: string }) => v.title);
    expect(noneTitles).toContain(PW.content.globalClip);
    expect(noneTitles).not.toContain(PW.content.alphaClip);
    expect(noneTitles).not.toContain(PW.content.betaClip);
  });
});
