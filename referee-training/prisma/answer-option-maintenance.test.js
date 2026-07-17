const assert = require("node:assert/strict");
const test = require("node:test");
const {
  HistoricalAnswerReferenceError,
  replaceAnswerOptionsSafely,
} = require("./answer-option-maintenance");

test("replaceAnswerOptionsSafely refuses to delete referenced answer options", async () => {
  const calls = [];
  const tx = {
    answerOption: {
      findMany: async () => [{ id: "option-1" }],
      deleteMany: async () => calls.push("deleteMany"),
      createMany: async () => calls.push("createMany"),
    },
    testAnswer: {
      count: async () => 1,
    },
  };

  await assert.rejects(
    () =>
      replaceAnswerOptionsSafely(tx, "question-1", [
        { label: "New answer", isCorrect: true },
      ]),
    HistoricalAnswerReferenceError
  );
  assert.deepEqual(calls, []);
});

test("replaceAnswerOptionsSafely replaces unreferenced answer options", async () => {
  const calls = [];
  const tx = {
    answerOption: {
      findMany: async () => [{ id: "option-1" }],
      deleteMany: async (args) => calls.push(["deleteMany", args]),
      createMany: async (args) => calls.push(["createMany", args]),
    },
    testAnswer: {
      count: async () => 0,
    },
  };

  await replaceAnswerOptionsSafely(tx, "question-1", [
    { label: "Correct answer", isCorrect: true },
    { label: "Distractor", isCorrect: false },
  ]);

  assert.deepEqual(calls, [
    ["deleteMany", { where: { questionId: "question-1" } }],
    [
      "createMany",
      {
        data: [
          {
            questionId: "question-1",
            label: "Correct answer",
            code: "OPT_0",
            isCorrect: true,
            order: 0,
          },
          {
            questionId: "question-1",
            label: "Distractor",
            code: "OPT_1",
            isCorrect: false,
            order: 1,
          },
        ],
      },
    ],
  ]);
});
