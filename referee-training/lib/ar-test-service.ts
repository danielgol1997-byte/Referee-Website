import { prisma } from "./prisma";
import { ArDecision } from "@prisma/client";

export const AR_TEST_CLIP_COUNT = 10;

/** Fisher-Yates shuffle */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Start a new AR test session for a user.
 *
 * Picks up to AR_TEST_CLIP_COUNT active clips, prioritizing clips the user
 * has never been tested on. Only when there are fewer unseen clips than
 * needed does it top up with already-seen clips (both groups shuffled).
 */
export async function createArTestSession(userId: string) {
  const [activeClips, seenAnswers] = await Promise.all([
    prisma.arClip.findMany({
      where: { isActive: true },
      select: { id: true },
    }),
    prisma.arTestAnswer.findMany({
      where: { session: { userId } },
      select: { arClipId: true },
      distinct: ["arClipId"],
    }),
  ]);

  if (activeClips.length === 0) {
    throw new Error("No assistant referee clips are available yet");
  }

  const seenIds = new Set(seenAnswers.map((a) => a.arClipId));
  const unseen = shuffleArray(activeClips.filter((c) => !seenIds.has(c.id)).map((c) => c.id));
  const seen = shuffleArray(activeClips.filter((c) => seenIds.has(c.id)).map((c) => c.id));

  const clipIds = [...unseen, ...seen].slice(0, AR_TEST_CLIP_COUNT);
  // Shuffle again so recycled clips are not always grouped at the end
  const orderedClipIds = shuffleArray(clipIds);

  const session = await prisma.arTestSession.create({
    data: {
      userId,
      clipIds: orderedClipIds,
      totalClips: orderedClipIds.length,
    },
  });
  return { session };
}

type ArAnswerInput = {
  arClipId: string;
  answer: "OFFSIDE" | "ONSIDE";
  timeToAnswerMs?: number | null;
};

export async function submitArTestAnswers(
  userId: string,
  sessionId: string,
  answers: ArAnswerInput[]
) {
  const session = await prisma.arTestSession.findUnique({
    where: { id: sessionId },
  });
  if (!session || session.userId !== userId) throw new Error("Session not found");
  if (session.completedAt) throw new Error("Session already submitted");

  const clips = await prisma.arClip.findMany({
    where: { id: { in: session.clipIds } },
    select: { id: true, correctAnswer: true },
  });
  const clipMap = new Map(clips.map((c) => [c.id, c]));
  const answerMap = new Map(answers.map((a) => [a.arClipId, a]));

  const toCreate: Array<{
    arTestSessionId: string;
    arClipId: string;
    userAnswer: ArDecision;
    isCorrect: boolean;
    timeToAnswerMs: number | null;
  }> = [];

  for (const clipId of session.clipIds) {
    const clip = clipMap.get(clipId);
    const answer = answerMap.get(clipId);
    if (!clip || !answer) continue;
    if (answer.answer !== "OFFSIDE" && answer.answer !== "ONSIDE") continue;

    toCreate.push({
      arTestSessionId: sessionId,
      arClipId: clipId,
      userAnswer: answer.answer,
      isCorrect: answer.answer === clip.correctAnswer,
      timeToAnswerMs:
        typeof answer.timeToAnswerMs === "number" && Number.isFinite(answer.timeToAnswerMs)
          ? Math.max(Math.round(answer.timeToAnswerMs), 0)
          : null,
    });
  }

  await prisma.arTestAnswer.createMany({ data: toCreate, skipDuplicates: true });

  const correctCount = toCreate.filter((a) => a.isCorrect).length;
  await prisma.arTestSession.update({
    where: { id: sessionId },
    data: {
      score: correctCount,
      completedAt: new Date(),
      submittedAt: new Date(),
      totalAnswerTimeMs: toCreate.reduce((total, a) => total + (a.timeToAnswerMs ?? 0), 0),
    },
  });

  return { correctCount, totalClips: session.totalClips };
}

export async function getArTestSessionSummary(userId: string, sessionId: string) {
  const session = await prisma.arTestSession.findUnique({
    where: { id: sessionId },
    include: { answers: true },
  });
  if (!session || session.userId !== userId) throw new Error("Session not found");

  const clips = await prisma.arClip.findMany({
    where: { id: { in: session.clipIds } },
    select: {
      id: true,
      title: true,
      fileUrl: true,
      thumbnailUrl: true,
      correctAnswer: true,
      passMomentTime: true,
      passFrameUrl: true,
    },
  });
  const clipMap = new Map(clips.map((c) => [c.id, c]));
  const answerMap = new Map(session.answers.map((a) => [a.arClipId, a]));

  const items = session.clipIds.map((clipId) => {
    const clip = clipMap.get(clipId);
    const answer = answerMap.get(clipId);
    return {
      clip: clip
        ? {
            id: clip.id,
            title: clip.title,
            fileUrl: clip.fileUrl,
            thumbnailUrl: clip.thumbnailUrl,
            correctAnswer: clip.correctAnswer,
            passMomentTime: clip.passMomentTime,
            passFrameUrl: clip.passFrameUrl,
          }
        : null,
      answer: answer
        ? {
            userAnswer: answer.userAnswer,
            isCorrect: answer.isCorrect,
            timeToAnswerMs: answer.timeToAnswerMs,
          }
        : null,
    };
  });

  return {
    session: {
      id: session.id,
      score: session.score,
      totalClips: session.totalClips,
      completedAt: session.completedAt,
    },
    correctCount: session.score ?? 0,
    total: session.totalClips,
    items,
  };
}

/** All completed AR test sessions for the landing page, newest first. */
export async function getArTestHistory(userId: string) {
  const sessions = await prisma.arTestSession.findMany({
    where: { userId, completedAt: { not: null } },
    orderBy: { completedAt: "desc" },
    select: {
      id: true,
      score: true,
      totalClips: true,
      completedAt: true,
    },
  });
  return sessions;
}
