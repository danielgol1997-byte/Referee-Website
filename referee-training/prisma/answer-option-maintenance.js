class HistoricalAnswerReferenceError extends Error {
  constructor(questionId, referenceCount) {
    super(
      `Refusing to replace answer options for question ${questionId}: ` +
        `${referenceCount} historical test answer(s) reference existing options.`
    );
    this.name = "HistoricalAnswerReferenceError";
    this.questionId = questionId;
    this.referenceCount = referenceCount;
  }
}

function normalizeAnswerOption(option, index) {
  return {
    label: option.label,
    code: option.code || `OPT_${index}`,
    isCorrect: !!option.isCorrect,
    order: index,
  };
}

async function replaceAnswerOptionsSafely(tx, questionId, answerOptions) {
  const existingOptions = await tx.answerOption.findMany({
    where: { questionId },
    select: { id: true },
  });

  if (existingOptions.length > 0) {
    const referencedAnswers = await tx.testAnswer.count({
      where: {
        selectedOptionId: {
          in: existingOptions.map((option) => option.id),
        },
      },
    });

    if (referencedAnswers > 0) {
      throw new HistoricalAnswerReferenceError(questionId, referencedAnswers);
    }
  }

  await tx.answerOption.deleteMany({ where: { questionId } });

  if (answerOptions.length === 0) {
    return;
  }

  await tx.answerOption.createMany({
    data: answerOptions.map((option, index) => ({
      ...normalizeAnswerOption(option, index),
      questionId,
    })),
  });
}

function isHistoricalAnswerReferenceError(error) {
  return error?.name === "HistoricalAnswerReferenceError";
}

module.exports = {
  HistoricalAnswerReferenceError,
  isHistoricalAnswerReferenceError,
  normalizeAnswerOption,
  replaceAnswerOptionsSafely,
};
