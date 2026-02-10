import { prisma } from "./prisma";
import { VideoTestType } from "@prisma/client";

/** Fisher-Yates shuffle */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function getMandatoryVideoTests(userId: string) {
  const tests = await prisma.videoTest.findMany({
    where: {
      type: VideoTestType.MANDATORY,
      isActive: true,
    },
    include: {
      completions: { where: { userId } },
    },
    orderBy: { dueDate: "asc" },
  });
  return tests.map((t) => ({
    ...t,
    completed: t.completions.length > 0,
    completion: t.completions[0] ?? null,
  }));
}

export async function getPoolVideoTests(userId: string) {
  const [publicTests, userTests] = await Promise.all([
    prisma.videoTest.findMany({
      where: {
        type: VideoTestType.PUBLIC,
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.videoTest.findMany({
      where: {
        type: VideoTestType.USER,
        isActive: true,
        createdById: userId,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return { public: publicTests, myTests: userTests };
}

export async function createVideoTestSession(userId: string, videoTestId: string) {
  const videoTest = await prisma.videoTest.findUnique({
    where: { id: videoTestId, isActive: true },
    include: { clips: { orderBy: { order: "asc" }, include: { videoClip: true } } },
  });
  if (!videoTest) throw new Error("Video test not found");
  if (videoTest.clips.length === 0) throw new Error("Video test has no clips");

  const clipIds = shuffleArray(videoTest.clips.map((c) => c.videoClipId));

  const session = await prisma.videoTestSession.create({
    data: {
      userId,
      videoTestId,
      clipIds,
      totalClips: clipIds.length,
    },
  });
  return { session };
}

type AnswerInput = {
  videoClipId: string;
  playOnNoOffence: boolean;
  restartTagId?: string | null;
  sanctionTagId?: string | null;
  criteriaTagIds?: string[];
};

function scoreAnswer(
  clip: { playOn: boolean; noOffence: boolean; tags: { tagId: string; isCorrectDecision: boolean; tag: { category: { slug: string } } }[] },
  answer: AnswerInput
): { isCorrect: boolean; isPartial: boolean } {
  const correctRestart = clip.tags.find((t) => t.isCorrectDecision && t.tag.category.slug === "restarts");
  const correctSanction = clip.tags.find((t) => t.isCorrectDecision && t.tag.category.slug === "sanction");
  const correctCriteria = clip.tags.filter((t) => t.isCorrectDecision && t.tag.category.slug === "criteria");

  if (clip.playOn || clip.noOffence) {
    const correct = answer.playOnNoOffence && !answer.restartTagId && !answer.sanctionTagId && (answer.criteriaTagIds?.length ?? 0) === 0;
    return { isCorrect: correct, isPartial: false };
  }

  let restartOk = !correctRestart ? !answer.restartTagId : answer.restartTagId === correctRestart.tagId;
  let sanctionOk = !correctSanction ? !answer.sanctionTagId : answer.sanctionTagId === correctSanction.tagId;
  const correctCriteriaIds = new Set(correctCriteria.map((c) => c.tagId));
  const userCriteriaSet = new Set(answer.criteriaTagIds ?? []);
  const criteriaOk =
    correctCriteriaIds.size === 0
      ? userCriteriaSet.size === 0
      : correctCriteriaIds.size === userCriteriaSet.size && [...correctCriteriaIds].every((id) => userCriteriaSet.has(id));

  const matchCount = [restartOk, sanctionOk, criteriaOk].filter(Boolean).length;
  const isCorrect = matchCount === 3;
  const isPartial = matchCount >= 1 && !isCorrect;
  return { isCorrect, isPartial };
}

export async function submitVideoTestAnswers(
  userId: string,
  sessionId: string,
  answers: AnswerInput[]
) {
  const session = await prisma.videoTestSession.findUnique({
    where: { id: sessionId },
    include: { videoTest: true },
  });
  if (!session || session.userId !== userId) throw new Error("Session not found");
  if (session.completedAt) throw new Error("Session already submitted");

  const clipIds = session.clipIds;
  const clipsWithTags = await prisma.videoClip.findMany({
    where: { id: { in: clipIds }, isActive: true },
    include: {
      tags: {
        where: { isCorrectDecision: true },
        include: { tag: { include: { category: true } } },
      },
    },
  });
  const clipMap = new Map(clipsWithTags.map((c) => [c.id, c]));

  const answerMap = new Map(answers.map((a) => [a.videoClipId, a]));

  const toCreate: Array<{
    videoTestSessionId: string;
    videoClipId: string;
    playOnNoOffence: boolean;
    restartTagId: string | null;
    sanctionTagId: string | null;
    criteriaTagIds: string[];
    isCorrect: boolean;
    isPartial: boolean;
  }> = [];

  for (const clipId of clipIds) {
    const clip = clipMap.get(clipId);
    const answer = answerMap.get(clipId);
    if (!clip || !answer) continue;

    const tagsForScoring = clip.tags.map((vt) => ({
      tagId: vt.tagId,
      isCorrectDecision: vt.isCorrectDecision,
      tag: { category: vt.tag.category },
    }));
    const { isCorrect, isPartial } = scoreAnswer(
      { playOn: clip.playOn, noOffence: clip.noOffence, tags: tagsForScoring },
      answer
    );

    toCreate.push({
      videoTestSessionId: sessionId,
      videoClipId: clipId,
      playOnNoOffence: answer.playOnNoOffence,
      restartTagId: answer.restartTagId ?? null,
      sanctionTagId: answer.sanctionTagId ?? null,
      criteriaTagIds: answer.criteriaTagIds ?? [],
      isCorrect,
      isPartial,
    });
  }

  await prisma.videoTestAnswer.createMany({ data: toCreate });

  const correctCount = toCreate.filter((a) => a.isCorrect).length;
  await prisma.videoTestSession.update({
    where: { id: sessionId },
    data: { score: correctCount, completedAt: new Date() },
  });

  if (session.videoTest.type === VideoTestType.MANDATORY) {
    await prisma.videoTestCompletion.upsert({
      where: {
        userId_videoTestId: { userId, videoTestId: session.videoTestId },
      },
      create: {
        userId,
        videoTestId: session.videoTestId,
        videoTestSessionId: sessionId,
        completedAt: new Date(),
        score: correctCount,
        passed: undefined,
      },
      update: {
        videoTestSessionId: sessionId,
        completedAt: new Date(),
        score: correctCount,
      },
    });
  }

  return { correctCount, totalClips: session.totalClips };
}

export async function getVideoTestSessionSummary(userId: string, sessionId: string) {
  const session = await prisma.videoTestSession.findUnique({
    where: { id: sessionId },
    include: {
      videoTest: true,
      answers: true,
    },
  });
  if (!session || session.userId !== userId) throw new Error("Session not found");

  const clipIds = session.clipIds;
  const clips = await prisma.videoClip.findMany({
    where: { id: { in: clipIds } },
    include: {
      tags: {
        where: { isCorrectDecision: true },
        include: { tag: { include: { category: true } } },
      },
    },
  });
  const tagIds = new Set<string>();
  for (const a of session.answers) {
    if (a.restartTagId) tagIds.add(a.restartTagId);
    if (a.sanctionTagId) tagIds.add(a.sanctionTagId);
    a.criteriaTagIds.forEach((id) => tagIds.add(id));
  }
  const tags = tagIds.size > 0 ? await prisma.tag.findMany({ where: { id: { in: [...tagIds] } } }) : [];
  const tagMap = new Map(tags.map((t) => [t.id, t]));

  const clipMap = new Map(clips.map((c) => [c.id, c]));
  const answerMap = new Map(session.answers.map((a) => [a.videoClipId, a]));

  const items = clipIds.map((clipId) => {
    const clip = clipMap.get(clipId);
    const answer = answerMap.get(clipId);
    const restartTags = clip?.tags.filter((t) => t.tag.category.slug === "restarts") ?? [];
    const sanctionTags = clip?.tags.filter((t) => t.tag.category.slug === "sanction") ?? [];
    const criteriaTags = clip?.tags.filter((t) => t.tag.category.slug === "criteria") ?? [];
    return {
      clip: clip
        ? {
            id: clip.id,
            title: clip.title,
            fileUrl: clip.fileUrl,
            thumbnailUrl: clip.thumbnailUrl,
            playOn: clip.playOn,
            noOffence: clip.noOffence,
            correctRestart: restartTags[0]?.tag ?? null,
            correctSanction: sanctionTags[0]?.tag ?? null,
            correctCriteria: criteriaTags.map((t) => t.tag),
          }
        : null,
      answer: answer
        ? {
            playOnNoOffence: answer.playOnNoOffence,
            restartTagId: answer.restartTagId,
            sanctionTagId: answer.sanctionTagId,
            criteriaTagIds: answer.criteriaTagIds,
            userRestartTag: answer.restartTagId ? tagMap.get(answer.restartTagId) ?? null : null,
            userSanctionTag: answer.sanctionTagId ? tagMap.get(answer.sanctionTagId) ?? null : null,
            userCriteriaTags: (answer.criteriaTagIds ?? []).map((id) => tagMap.get(id)).filter(Boolean),
            isCorrect: answer.isCorrect,
            isPartial: answer.isPartial,
          }
        : null,
    };
  });

  return {
    session: {
      id: session.id,
      score: session.score,
      totalClips: session.totalClips,
      videoTest: session.videoTest,
    },
    correctCount: session.score ?? 0,
    total: session.totalClips,
    items,
  };
}
