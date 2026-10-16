# CLAUDE.md — Frontend Guidelines (lms_web_demo)

## Project Overview

Orange Tree LMS Frontend is a Next.js 16 App Router application built with React 19, Tailwind CSS v4, TanStack React Query v5, and Axios. It serves three user roles:

- **ADMIN**
- **INSTRUCTOR**
- **STUDENT**

This file defines the coding, architecture, reuse, and implementation rules for the frontend.

---

## Folder Structure

```text
src/
├── app/                         # Next.js App Router pages
│   ├── admin/                   # Admin portal
│   ├── instructor/              # Instructor portal
│   ├── student/                 # Student portal
│   ├── courses/[courseId]/      # Student public course details
│   ├── login/                   # Authentication
│   ├── register/                # Authentication
│   └── page.tsx, layout.tsx     # Root landing & layout
│
├── components/                  # UI components
│   ├── common/, ui/             # Reusable UI primitives
│   ├── instructor/              # Instructor-specific components
│   └── student/                 # Student-specific components
│
├── hooks/
│   ├── queries/                 # TanStack React Query custom hooks
│   │   ├── admin/
│   │   ├── instructor/
│   │   └── student/
│   └── useAuth.js, useRazorpayCheckout.js
│
├── services/                    # API layer / Axios wrappers
│   ├── topic.service.js
│   ├── course.service.js
│   ├── module.service.js
│   ├── lesson.service.js
│   ├── store.service.js
│   ├── payment.service.js
│   ├── enrollment.service.js
│   └── admin/, instructor/, student/
│
├── lib/                         # Axios instance and query options
└── constants/                   # queryKeys.js, navigation, config
```

Do not assume a file exists only because it is mentioned in documentation. Inspect the repository before importing or creating anything.

---

## Canonical Course Hierarchy

```text
Course
├── CQA
└── Module
    ├── CQA
    └── Lesson
        ├── CQA
        └── Topic
            ├── CQA
            └── SubTopic
                ├── CQA
                └── Concept
                    └── CQA
```

CQA = Content, Quiz, Assignment. CQA is supported at all six levels.

SubTopic and Concept are **optional**, and CQA and child levels can coexist:

- OLD: `Course → Module → Lesson → Topic → CQA` (a Topic with no SubTopics) must keep working unchanged.
- NEW: `Course → Module → Lesson → Topic → SubTopic → Concept → CQA`.
- MIXED: a Topic (or SubTopic) with its own CQA **and** child SubTopics (or Concepts).

### Current State

`Topic`, `SubTopic` and `Concept` are implemented across the stack:

- Prisma schema (`Topic.subTopics`, `SubTopic.concepts`; Content/Quiz/Assignment carry `subTopicId`/`conceptId`)
- Backend `/topics`, `/subtopics`, `/concepts` APIs
- `topic.service.js`, `subTopic.service.js`, `concept.service.js`
- Topic, SubTopic and Concept React Query hooks (`src/hooks/queries/instructor/`)
- Instructor Course Composer (Course Map rows, CRUD, reorder, content and quizzes at every level)
- Student Learning Player (Course Map, Prev/Next, gates, resume, progress)

Do **not** reimplement Topic, SubTopic or Concept as new features, and do not introduce a generic `children` property — the real nesting keys are `topic.subTopics[]` and `subTopic.concepts[]`.

### Rules for hierarchy-aware code

- Walk the hierarchy through the shared helpers rather than new loops: `lib/courseMapper.js` (normalization, quiz placement), `lib/courseUnits.js` (Prev/Next units, `resolveLessonPathway`), `lib/progressIndex.js`, `lib/resumeTarget.js`. `courseUnits.js` and `resumeTarget.js` must traverse in the same order — `src/lib/__tests__/resumeTarget.test.js` checks this.
- Quiz rows may carry every ancestor id. Place a quiz at its most specific parent (concept > subTopic > topic > lesson > module > course) and never show it at an ancestor level.
- Content and Assignment carry exactly one parent id. Content parent types are `course | module | lesson | topic | subTopic | concept` (exact spelling — the list query is `?${parentType}Id=`).
- The instructor modules tree (`GET /modules`) stops at Topic; the Composer loads SubTopics/Concepts lazily (`useSubTopics`, `useConcepts`) and must not treat "still loading" as "invalid" when restoring `?subTopic=`/`?concept=` from the URL.
- Import drafts and the AI composer are Topic-only; do not expose SubTopic/Concept actions there until the backend supports them.

### Target State

Maintain a seamless experience at every level across:

- Instructor course composition
- Topic, SubTopic and Concept management
- Content management
- Student lesson/topic/subtopic/concept navigation
- Student learning experience

If a hierarchy-related defect is found, modify the existing implementation rather than creating a parallel architecture.

---

# Core Development Rules

## 1. Inspect Before Implementing

Before modifying code:

1. Read the target file.
2. Read its related service/hook/component.
3. Search the repository for existing implementations of the same or similar functionality.
4. Check existing API contracts.
5. Check existing reusable components and patterns.
6. Understand dependencies and consumers.
7. Make the smallest required change.
8. Verify the change.

Do not implement from assumptions when the repository already contains relevant code.

---

# 2. Reuse Existing Components — Mandatory

## Reuse First, Create Second

Before creating **any new frontend component**, search the existing codebase.

At minimum search:

```text
src/components/
src/app/
src/hooks/
src/services/
```

Search for components with:

- the same name;
- the same responsibility;
- similar UI structure;
- similar behavior;
- similar form fields;
- similar loading/error states;
- similar layout patterns.

### Required decision process

```text
Need a component
      ↓
Search existing components
      ↓
Found suitable component?
      ├── YES → Reuse it
      │          ↓
      │      Need small changes?
      │          ├── YES → Extend with props
      │          └── NO  → Use directly
      │
      └── NO → Evaluate whether a new component is justified
                    ↓
              Create only if necessary
```

### Before creating a new component

You MUST answer:

1. What existing components were searched?
2. Which existing components were considered?
3. Why can they not be reused?
4. Why is a new component necessary?
5. What single responsibility will the new component have?

If these questions cannot be answered, do not create the component yet.

### Do not create duplicate components

Do NOT create components such as:

```text
Button2
NewButton
CustomButton2
CourseCardV2
NewCourseCard
AdminCourseCardNew
PricingCardNew
NewModal
```

when an existing component can be reused or extended.

Do not duplicate JSX/CSS simply because the existing component is in another feature folder.

---

# 3. Prefer Extension Over Duplication

If an existing component is close to the required behavior:

```text
ExistingComponent
        ↓
Add focused props
        ↓
Reuse existing component
```

Example:

```jsx
<CourseCard
  course={course}
  showPrice
  showInstructor
/>
```

is preferred over creating:

```text
CourseCard
AdminCourseCard
StudentCourseCard
InstructorCourseCard
```

when the differences can be cleanly represented through props.

However, do not overload a component with unrelated responsibilities merely to avoid creating a new component.

The goal is:

> **Reuse when responsibilities are compatible; create a new component when responsibilities are genuinely different.**

---

# 4. Shared Component Safety

Before changing a shared component:

1. Search all usages of the component.
2. Inspect its consumers.
3. Understand whether the change affects Admin, Instructor, or Student.
4. Preserve existing behavior unless the task explicitly requires a change.
5. Test affected consumers.

A shared component change is higher risk than a feature-local component change.

Do not modify a shared component merely to solve a problem that can be solved locally.

---

# 5. API Service Layer

All HTTP calls must be placed inside:

```text
src/services/
```

Pages and components must **NEVER call Axios directly**.

Correct:

```text
Component/Page
      ↓
React Query Hook
      ↓
Service
      ↓
Axios
      ↓
Backend API
```

Incorrect:

```text
Component/Page
      ↓
Axios directly
```

Do not introduce a second API access pattern.

---

# 6. Server State

Use TanStack React Query v5 for server state.

Query hooks belong under:

```text
src/hooks/queries/
```

organized by role where appropriate:

```text
src/hooks/queries/admin/
src/hooks/queries/instructor/
src/hooks/queries/student/
```

Do not duplicate API-fetching logic between pages.

---

# 7. Query Keys

Use the existing:

```text
src/constants/queryKeys.js
```

convention.

Do not create arbitrary query-key strings throughout components.

When adding a new query:

1. Check existing query keys.
2. Reuse an existing key structure if applicable.
3. Add a new key only when the resource genuinely requires one.
4. Keep invalidation consistent with existing patterns.

---

# 8. Role Boundaries & RBAC Rules

## ADMIN

Responsible for:

- Setting/updating course pricing
- Discount pricing
- Store pricing
- Reviewing courses
- Publishing courses
- Unpublishing courses
- Archiving courses

Current known gap:

```text
/admin/courses/[courseId]
```

requires Store pricing management UI.

---

## INSTRUCTOR

Responsible for:

- Creating courses
- Editing owned course content
- Managing modules
- Managing lessons
- Managing topics
- Managing content items
- Managing quizzes
- Managing course metadata

Instructor MUST NOT:

- Set prices
- Change prices
- Set discounts
- Change discounts
- Modify Store pricing
- Publish courses
- Unpublish courses
- Archive courses

Current known gap:

```text
/instructor/courses/[courseId]
```

contains a publish toggle that must be removed.

Frontend restrictions are not security boundaries. Backend RBAC remains authoritative.

---

## STUDENT

Responsible for:

- Browsing published courses
- Viewing course details
- Purchasing valid paid courses
- Accessing enrolled courses

Current known gap:

```text
/courses/[courseId]
```

contains a hardcoded:

```text
₹4,999.00
```

fallback.

This must be replaced with a safe pricing state.

---

# 9. Pricing Rules

A course is purchasable only when:

```text
Store exists
AND
price > 0
AND
isFree === false
```

The frontend must use the actual Store data.

Never:

- hardcode a course price;
- use a fake fallback price;
- assume a course is free because Store data is missing;
- trust frontend price for payment;
- send `amount` to determine the authoritative payment amount.

If pricing is invalid:

```text
Pricing unavailable
```

must be shown and purchase must not be available.

If pricing is valid:

```text
Actual Store price
        ↓
BUY COURSE
```

If the student is already enrolled:

```text
CONTINUE LEARNING
```

---

# 10. Payment Rules

Recommendation cards must navigate through:

```text
VIEW COURSE
```

They must not launch Razorpay directly.

The frontend payment flow is:

```text
Course Details
      ↓
BUY COURSE
      ↓
POST /payments/orders
      ↓
Razorpay Checkout
      ↓
POST /payments/verify
      ↓
Enrollment ACTIVE
      ↓
CONTINUE LEARNING
```

The frontend must send only the required course identifier according to the existing API contract.

Never send frontend-authoritative:

```text
price
amount
discountPrice
userId
```

Do not manually:

- mark a payment successful;
- mark an order captured;
- create an enrollment after checkout.

---

# 11. Existing Pattern Before New Abstraction

Before creating any new:

- component;
- hook;
- service;
- utility;
- formatter;
- query;
- API wrapper;

search for an existing equivalent.

Use this decision:

```text
Existing equivalent?
    ↓
YES
    ↓
Can it be reused safely?
    ├── YES → Reuse
    └── NO  → Extend or refactor minimally

NO
    ↓
Is a new abstraction genuinely necessary?
    ├── NO  → Do not create it
    └── YES → Create focused abstraction
```

Do not create abstractions merely to make one file shorter.

---

# 12. No Unrelated Refactoring

When implementing a task, do not:

- rename unrelated files;
- reorganize unrelated folders;
- rewrite working components;
- replace libraries;
- introduce another state-management library;
- redesign the payment architecture;
- redesign Enrollment;
- reimplement Topic;
- create duplicate components;
- change unrelated API contracts;
- reformat unrelated files.

Keep the change set focused.

---

# 13. Loading, Error, Empty & Permission States

When modifying a UI feature, inspect existing patterns for:

- loading;
- error;
- empty;
- disabled;
- unauthorized;
- success states.

Reuse existing components/patterns where possible.

Do not create a new Loading component if an existing project-wide loading component already exists.

Do not create a new Alert component if the existing alert/error pattern is suitable.

---

# 14. Shared Component Creation Checklist

If a new component is genuinely required, document this before implementation:

```text
Component:
Responsibility:

Existing components searched:
1.
2.
3.

Why they cannot be reused:

Why extension is not appropriate:

Why the new component is necessary:
```

The new component must:

- have one clear responsibility;
- follow existing naming conventions;
- use existing styling patterns;
- reuse existing primitives where possible;
- avoid duplicating business logic;
- avoid creating a parallel architecture.

---

# 15. Working With Implementation Plan

Before implementing a feature, read:

```text
IMPLEMENTATION_PLAN.md
```

Follow its:

- phases;
- dependencies;
- exit criteria;
- reusable-component checklist;
- testing requirements.

Do not skip an earlier dependency just because a later task appears easier.

---

# 16. Available Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

Run the relevant scripts after implementation.

Never report a command as successful unless it was actually executed.

---

# 17. Definition of Done

Before declaring a frontend task complete:

### Architecture

- [ ] Existing architecture was inspected.
- [ ] Existing services/hooks/query patterns were followed.
- [ ] No unnecessary architecture was introduced.

### Reuse

- [ ] Existing components were searched.
- [ ] Existing reusable components were reused where applicable.
- [ ] Existing components were extended instead of duplicated where appropriate.
- [ ] No duplicate component was introduced without justification.
- [ ] New component justification exists if a new component was necessary.

### API/Data

- [ ] No Axios call exists directly in pages/components.
- [ ] React Query is used for server state.
- [ ] Existing query-key conventions are followed.
- [ ] Existing service-layer conventions are followed.

### UI

- [ ] Loading state handled.
- [ ] Error state handled.
- [ ] Empty state handled where applicable.
- [ ] Permission state handled where applicable.
- [ ] Responsive behavior preserved.
- [ ] Accessibility preserved.

### Business Rules

- [ ] Instructor has no pricing controls.
- [ ] Instructor has no publication controls.
- [ ] Admin pricing UI follows the approved Store model.
- [ ] Student sees actual Store pricing.
- [ ] Invalid pricing shows `Pricing unavailable`.
- [ ] No hardcoded course price remains.
- [ ] Recommendation cards use `VIEW COURSE`.
- [ ] Payment flow remains backend-authoritative.

### Verification

- [ ] Relevant tests/checks were executed.
- [ ] Lint passes where applicable.
- [ ] Build passes where applicable.
- [ ] Exact files changed are known.
- [ ] No unrelated files were modified.

---

# 18. Final Response Format for Coding Tasks

After completing a task, report:

## Changed Files

```text
path/to/file
path/to/file
```

## Reused Components / Patterns

```text
Existing component/pattern:
How it was reused:
```

## New Components

```text
None
```

or:

```text
Component:
Why it was necessary:
Existing components evaluated:
```

## Implementation

Briefly explain what changed.

## Verification

```text
Lint:
Build:
Tests:
Manual verification:
```

## Remaining Issues

List only actual remaining issues.

Do not claim completion if required verification was not performed.
