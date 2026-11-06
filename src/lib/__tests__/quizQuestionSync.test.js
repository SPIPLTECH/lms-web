import { planQuizQuestionSync, runQuizQuestionSync } from "../quizQuestionSync.js";

const q = (overrides = {}) => ({
  id: "q1",
  question: "What is 2 + 2?",
  questionType: "MCQ_SINGLE",
  options: ["3", "4"],
  correctAnswer: "4",
  explanation: "",
  marks: 1,
  difficulty: "MEDIUM",
  ...overrides,
});

const fakeServices = ({ failUpdateId = null, delayMs = 5 } = {}) => {
  const calls = [];
  let inFlight = 0;
  let maxInFlight = 0;
  const track = (name, payload, fail) => async () => {
    inFlight++;
    maxInFlight = Math.max(maxInFlight, inFlight);
    calls.push({ name, payload });
    await new Promise((r) => setTimeout(r, delayMs));
    inFlight--;
    if (fail) throw new Error(`${name} failed`);
  };
  return {
    calls,
    maxInFlight: () => maxInFlight,
    services: {
      bulkCreate: (quizId, payloads) => track("create", payloads)(),
      attach: (quizId, ids) => track("attach", ids)(),
      update: (id) => track("update", id, id === failUpdateId)(),
      remove: (quizId, id) => track("remove", id)(),
    },
  };
};

const sameIds = (list, ids) => JSON.stringify(list) === JSON.stringify(ids);

async function runTests() {
  const testCases = [
    {
      name: "an existing question identical to what was loaded is not re-saved",
      check: () => {
        const plan = planQuizQuestionSync({
          currentQuestions: [q()],
          originalQuestionIds: ["q1"],
          loadedQuestions: [q()],
        });
        return plan.update.length === 0 && plan.create.length === 0 && plan.remove.length === 0;
      },
    },
    {
      name: "an edited existing question is re-saved with its new fields",
      check: () => {
        const plan = planQuizQuestionSync({
          currentQuestions: [q({ question: "What is 3 + 3?" })],
          originalQuestionIds: ["q1"],
          loadedQuestions: [q()],
        });
        return plan.update.length === 1 && plan.update[0].id === "q1" && plan.update[0].payload.question === "What is 3 + 3?";
      },
    },
    {
      name: "an edit to a nested option explanation counts as a change",
      check: () => {
        const plan = planQuizQuestionSync({
          currentQuestions: [q({ options: [{ optionText: "3", explanation: "off by one" }, "4"] })],
          originalQuestionIds: ["q1"],
          loadedQuestions: [q({ options: [{ optionText: "3", explanation: "too small" }, "4"] })],
        });
        return plan.update.length === 1;
      },
    },
    {
      name: "a string marks value equal to the loaded number is not a change",
      check: () => {
        const plan = planQuizQuestionSync({
          currentQuestions: [q({ marks: "1" })],
          originalQuestionIds: ["q1"],
          loadedQuestions: [q({ marks: 1 })],
        });
        return plan.update.length === 0;
      },
    },
    {
      name: "without a loaded snapshot every existing question is re-saved (old behaviour)",
      check: () => {
        const plan = planQuizQuestionSync({
          currentQuestions: [q(), q({ id: "q2" })],
          originalQuestionIds: ["q1", "q2"],
        });
        return sameIds(plan.update.map((u) => u.id), ["q1", "q2"]);
      },
    },
    {
      name: "new draft questions are bulk-created, repository picks attached, dropped ones removed",
      check: () => {
        const plan = planQuizQuestionSync({
          currentQuestions: [q({ id: "draft-que-x-1" }), q({ id: undefined }), q({ id: "repo-9" }), q()],
          originalQuestionIds: ["q1", "q-gone"],
          loadedQuestions: [q()],
        });
        return (
          plan.create.length === 2 &&
          sameIds(plan.attach, ["repo-9"]) &&
          sameIds(plan.remove, ["q-gone"]) &&
          plan.update.length === 0
        );
      },
    },
    {
      name: "updates and removals run in parallel, capped at the concurrency limit",
      check: async () => {
        const fake = fakeServices();
        const plan = planQuizQuestionSync({
          currentQuestions: Array.from({ length: 10 }, (_, i) => q({ id: `q${i}`, question: `edited ${i}` })),
          originalQuestionIds: [...Array.from({ length: 10 }, (_, i) => `q${i}`), "gone-1", "gone-2"],
          loadedQuestions: Array.from({ length: 10 }, (_, i) => q({ id: `q${i}` })),
        });
        await runQuizQuestionSync("quiz-1", plan, fake.services, { concurrency: 4 });
        const updates = fake.calls.filter((c) => c.name === "update").length;
        const removes = fake.calls.filter((c) => c.name === "remove").length;
        return updates === 10 && removes === 2 && fake.maxInFlight() === 4;
      },
    },
    {
      name: "creation and attaching finish before any update or removal starts",
      check: async () => {
        const fake = fakeServices();
        const plan = planQuizQuestionSync({
          currentQuestions: [q({ id: "draft-1" }), q({ id: "repo-9" }), q({ question: "edited" })],
          originalQuestionIds: ["q1", "gone"],
          loadedQuestions: [q()],
        });
        await runQuizQuestionSync("quiz-1", plan, fake.services);
        return sameIds(fake.calls.map((c) => c.name).slice(0, 2), ["create", "attach"]);
      },
    },
    {
      name: "one failed update still lets the others finish, then the save reports the failure",
      check: async () => {
        const fake = fakeServices({ failUpdateId: "q0" });
        const plan = planQuizQuestionSync({
          currentQuestions: Array.from({ length: 5 }, (_, i) => q({ id: `q${i}`, question: `edited ${i}` })),
          originalQuestionIds: Array.from({ length: 5 }, (_, i) => `q${i}`),
          loadedQuestions: Array.from({ length: 5 }, (_, i) => q({ id: `q${i}` })),
        });
        let threw = false;
        try {
          await runQuizQuestionSync("quiz-1", plan, fake.services, { concurrency: 2 });
        } catch (err) {
          threw = err.message === "update failed";
        }
        return threw && fake.calls.filter((c) => c.name === "update").length === 5;
      },
    },
    {
      name: "a save with nothing to sync makes no requests",
      check: async () => {
        const fake = fakeServices();
        const plan = planQuizQuestionSync({
          currentQuestions: [q()],
          originalQuestionIds: ["q1"],
          loadedQuestions: [q()],
        });
        await runQuizQuestionSync("quiz-1", plan, fake.services);
        return fake.calls.length === 0;
      },
    },
  ];

  let passed = 0;
  let failed = 0;
  for (const tc of testCases) {
    let ok = false;
    try {
      ok = (await tc.check()) === true;
    } catch (error) {
      console.error(error);
    }
    if (ok) {
      console.log(`[PASS] ${tc.name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${tc.name}`);
      failed++;
    }
  }

  console.log(`\nRESULTS: ${passed} Passed, ${failed} Failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
