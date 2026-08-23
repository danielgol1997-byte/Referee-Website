/* eslint-disable @typescript-eslint/no-require-imports */

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  assertDistinctDatabases,
  sortedAnswerOptions,
  validateLotgQuestion,
} = require("./copy-local-lotg-to-prod");

test("assertDistinctDatabases rejects the same database with different credentials or params", () => {
  assert.throws(
    () =>
      assertDistinctDatabases(
        "postgresql://local_user:local_pass@example.com/referee?schema=public",
        "postgresql://prod_user:prod_pass@example.com:5432/referee?sslmode=require"
      ),
    /same database/
  );
});

test("assertDistinctDatabases allows distinct database identities", () => {
  assert.doesNotThrow(() =>
    assertDistinctDatabases(
      "postgresql://local_user:local_pass@localhost/referee",
      "postgresql://prod_user:prod_pass@example.com/referee"
    )
  );
});

test("validateLotgQuestion rejects questions without selectable answers", () => {
  assert.throws(
    () =>
      validateLotgQuestion({
        id: "question-1",
        text: "What is the correct restart?",
        answerOptions: [],
      }),
    /no answer options/
  );
});

test("validateLotgQuestion requires exactly one correct answer", () => {
  assert.throws(
    () =>
      validateLotgQuestion({
        id: "question-1",
        text: "What is the correct restart?",
        answerOptions: [
          { label: "Dropped ball", code: "A", isCorrect: false, order: 1 },
          { label: "Indirect free kick", code: "B", isCorrect: false, order: 2 },
        ],
      }),
    /exactly one correct/
  );

  assert.throws(
    () =>
      validateLotgQuestion({
        id: "question-2",
        text: "What is the correct restart?",
        answerOptions: [
          { label: "Dropped ball", code: "A", isCorrect: true, order: 1 },
          { label: "Indirect free kick", code: "B", isCorrect: true, order: 2 },
        ],
      }),
    /exactly one correct/
  );
});

test("sortedAnswerOptions preserves deterministic fallback codes and order", () => {
  assert.deepEqual(
    sortedAnswerOptions([
      { label: "Second", code: "", isCorrect: true, order: 2 },
      { label: "First", code: "A", isCorrect: false, order: 1 },
    ]),
    [
      { label: "First", code: "A", isCorrect: false, order: 1 },
      { label: "Second", code: "OPT_1", isCorrect: true, order: 2 },
    ]
  );
});
