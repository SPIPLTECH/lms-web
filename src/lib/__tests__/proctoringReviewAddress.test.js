import { openProctoringReview, resolveReviewTarget, reviewAddressFor } from "../proctoring/reviewAddress.js";

/** A review's address shows the quiz, and neither an id nor a student's name. */
let failed = 0;
const check = (name, ok) => {
    console.log(`${ok ? "[PASS]" : "[FAIL]"} ${name}`);
    if (!ok) failed += 1;
};

const fakeStorage = () => {
    const values = new Map();
    return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)) };
};
const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };

const LIST = "/instructor/proctoring";
const ID = "cmvz8zm4n002vueyw26zjjcl0";
const UUID = "10600d49-ecd3-4563-820e-14c4c3e0f70e";

check("the address is the quiz's title", reviewAddressFor(LIST, "Section A - Mock Test 02") === "/instructor/proctoring/section-a-mock-test-02");
check("a title with nothing usable gets a plain address", reviewAddressFor(LIST, "") === "/instructor/proctoring/review" && reviewAddressFor(LIST, null) === "/instructor/proctoring/review");
check("it works for the admin's list too", reviewAddressFor("/admin/proctoring", "Final Test") === "/admin/proctoring/final-test");

// Opening from the list.
{
    const storage = fakeStorage();
    const visited = [];
    openProctoringReview({ attemptId: ID, quizTitle: "Section A - Mock Test 02", listPath: LIST }, { storage, go: (url) => visited.push(url) });
    check("it goes to an address with no id", visited[0] === "/instructor/proctoring/section-a-mock-test-02");
    const found = resolveReviewTarget({ segment: "section-a-mock-test-02", listPath: LIST, storage });
    check("the review is known on arrival and after a refresh", found.attemptId === ID && found.address === "/instructor/proctoring/section-a-mock-test-02");
    check("reading it does not use it up", resolveReviewTarget({ segment: "section-a-mock-test-02", listPath: LIST, storage }).attemptId === ID);
    check("this tab's review is not shown at another quiz's address", resolveReviewTarget({ segment: "another-quiz", listPath: LIST, storage }).fallback === LIST);
}
{
    const visited = [];
    openProctoringReview({ attemptId: ID, quizTitle: "Mock", listPath: LIST }, { storage: blocked, go: (url) => visited.push(url) });
    check("a browser refusing storage still opens the review, by the id address", visited[0] === `${LIST}/${ID}`);
}

// Two students on the same quiz, one after the other in a tab.
{
    const storage = fakeStorage();
    openProctoringReview({ attemptId: "attempt-one-000", quizTitle: "Mock", listPath: LIST }, { storage, go: () => {} });
    openProctoringReview({ attemptId: "attempt-two-000", quizTitle: "Mock", listPath: LIST }, { storage, go: () => {} });
    check("the latest review opened is the one shown", resolveReviewTarget({ segment: "mock", listPath: LIST, storage }).attemptId === "attempt-two-000");
}

// Links holding an id, such as the notification an instructor gets.
for (const [name, id] of [["a generated id", ID], ["a uuid", UUID]]) {
    const storage = fakeStorage();
    const found = resolveReviewTarget({ segment: id, listPath: LIST, storage });
    check(`a notification link with ${name} still opens that review`, found.attemptId === id);
    check(`and its address is cleaned (${name})`, found.address === "/instructor/proctoring/review");
    check(`and a refresh after that still works (${name})`, resolveReviewTarget({ segment: "review", listPath: LIST, storage }).attemptId === id);
}
{
    const found = resolveReviewTarget({ segment: ID, listPath: LIST, storage: blocked });
    check("storage blocked: an id address opens and stays as it is", found.attemptId === ID && found.address === null);
}

// No review known: a pasted address, or a new tab.
check("an address with no review behind it goes to the list", resolveReviewTarget({ segment: "section-a-mock-test-02", listPath: LIST, storage: fakeStorage() }).fallback === LIST);
{
    const storage = fakeStorage();
    openProctoringReview({ attemptId: ID, quizTitle: "Mock", listPath: LIST }, { storage, go: () => {} });
    check("the same tab moving to the admin's list does not reuse an instructor's review", resolveReviewTarget({ segment: "mock", listPath: "/admin/proctoring", storage }).fallback === "/admin/proctoring");
}

if (failed > 0) process.exit(1);
