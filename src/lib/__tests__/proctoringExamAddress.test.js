import { examAddressFor, isOpaqueId, openProctoredExam, resolveExamTarget } from "../proctoring/examAddress.js";

/** The exam page's address shows the course, as the learn page does, and no ids. */
let failed = 0;
const check = (name, ok) => {
    console.log(`${ok ? "[PASS]" : "[FAIL]"} ${name}`);
    if (!ok) failed += 1;
};

const fakeStorage = () => {
    const values = new Map();
    return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)) };
};

const UUID = "10600d49-ecd3-4563-820e-14c4c3e0f70e";
const CUID = "cmvz7j04p000tuev08t9171cl";

check("a uuid and a generated id are ids", isOpaqueId(UUID) && isOpaqueId(CUID));
check("a course slug is not", !isOpaqueId("cdac-c-cat-course-section-b") && !isOpaqueId("c-cat-test-series") && !isOpaqueId("exam"));

check("the address takes the course's slug from where the student came from", examAddressFor("/student/learn/c-cat-test-series?item=a7bf6d8d-92b1-4e04-8146-155a6c8f7fbc") === "/student/proctored/c-cat-test-series");
check("a course still known only by its id does not leak it", examAddressFor(`/student/learn/${CUID}?item=x`) === "/student/proctored/exam");
check("coming from elsewhere: a plain address", examAddressFor(null) === "/student/proctored/exam" && examAddressFor("/student/quizzes") === "/student/proctored/exam");

// Going to the exam.
{
    const storage = fakeStorage();
    const visited = [];
    openProctoredExam({ quizId: UUID, returnTo: `/student/learn/c-cat-test-series?item=${UUID}` }, { storage, go: (url) => visited.push(url) });
    check("the address it goes to has no ids and no query", visited[0] === "/student/proctored/c-cat-test-series");

    const found = resolveExamTarget({ segment: "c-cat-test-series", from: null, storage });
    check("on arrival, and after every refresh, the exam is known", found.quizId === UUID && found.returnTo === `/student/learn/c-cat-test-series?item=${UUID}` && found.address === "/student/proctored/c-cat-test-series");
    const again = resolveExamTarget({ segment: "c-cat-test-series", from: null, storage });
    check("reading it does not use it up", again.quizId === UUID);
}
{
    const visited = [];
    const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
    openProctoredExam({ quizId: UUID, returnTo: "/student/learn/x" }, { storage: blocked, go: (url) => visited.push(url) });
    check("a browser refusing storage still reaches the exam, by the old address", visited[0] === `/student/proctored/${UUID}?from=${encodeURIComponent("/student/learn/x")}`);
}

// Old links.
{
    const storage = fakeStorage();
    const found = resolveExamTarget({ segment: UUID, from: `/student/learn/c-cat-test-series?item=${UUID}`, storage });
    check("an old link with an id still opens that exam", found.quizId === UUID && found.returnTo === `/student/learn/c-cat-test-series?item=${UUID}`);
    check("and the address is cleaned at once", found.address === "/student/proctored/c-cat-test-series");
    check("and a refresh after that still works", resolveExamTarget({ segment: "c-cat-test-series", from: null, storage }).quizId === UUID);
}
{
    const storage = fakeStorage();
    const found = resolveExamTarget({ segment: CUID, from: null, storage });
    check("an old link with no way back gets the plain address", found.quizId === CUID && found.returnTo === null && found.address === "/student/proctored/exam");
}

// No exam known: a pasted address, or a new tab.
{
    const storage = fakeStorage();
    check("a course address with no exam behind it goes to the course", resolveExamTarget({ segment: "c-cat-test-series", from: null, storage }).fallback === "/student/learn/c-cat-test-series");
    check("the plain address with no exam goes to the student's courses", resolveExamTarget({ segment: "exam", from: null, storage }).fallback === "/student/my-courses");
    const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
    const found = resolveExamTarget({ segment: UUID, from: null, storage: blocked });
    check("storage blocked: an id address opens the exam and stays as it is", found.quizId === UUID && found.address === null);
}

// A second exam in the same tab replaces the first.
{
    const storage = fakeStorage();
    openProctoredExam({ quizId: "quiz-a-0000", returnTo: "/student/learn/course-a" }, { storage, go: () => {} });
    openProctoredExam({ quizId: "quiz-b-0000", returnTo: "/student/learn/course-a" }, { storage, go: () => {} });
    check("the latest exam opened is the one shown", resolveExamTarget({ segment: "course-a", from: null, storage }).quizId === "quiz-b-0000");
}

if (failed > 0) process.exit(1);
