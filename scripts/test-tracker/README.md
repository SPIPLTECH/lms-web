# Component testing tracker

`COMPONENT_TESTING_TRACKER.xlsx` (project root) is the record of component testing for this frontend.
These scripts keep it in step with what has actually been executed.

| File | Role |
|---|---|
| `sync_tracker.py` | Rebuilds the inventory, runs tests and checks, merges the results into the workbook |
| `catalog.py` | Definitions: code-level checks, HTTP/API checks, browser cases, seed defects, purpose overrides |
| `manual-results.json` | Append-only log of browser and manual executions, with evidence |

## Run

```bash
npm run test:tracker        # inventory + unit tests + code checks + manual results (offline, ~1 min)
npm run test:tracker:full   # + HTTP/API checks against the local app + lint + build
python scripts/test-tracker/sync_tracker.py --http          # pick individual stages
```

Requirements: Python 3.9+ with `openpyxl` (`python -m pip install openpyxl`), plus Node.js. On macOS/Linux, use `python3` if `python` is not on PATH.
Close the workbook in Excel before syncing. The file is replaced atomically.

Testing is local: the targets default to `http://localhost:3000` (frontend, `npm run dev`) and `http://localhost:5000` (backend, `npm start` in `backend/lms-api`).
Set `TRACKER_BASE_URL` / `TRACKER_API_URL` to point the checks somewhere else.

Each run writes raw logs to `test-evidence/runs/<run id>/`. The workbook cites those files as evidence, so keep them.

## Dashboard

Every sync also writes the workbook's records as JSON to `test-evidence/dashboard-data/`.
The files are `test_cases`, `defects`, `components`, `build_lint` and `runs`.
The "LMS Component Testing" dashboard on claude.ai (https://claude.ai/artifact/Kitqkq8hhLZAu4bymqEXmN) shows those files.
It does not update by itself: after a sync, ask Claude to refresh the dashboard, which re-uploads the five files.

The workbook, the evidence and the exports are git-ignored (see `.gitignore`).
This folder of scripts is tracked.

## Recording a browser / manual result

Append an entry to `manual-results.json` and do not edit old entries:

```json
{ "id": "TC-UI-INS-003", "status": "FAIL", "executed_at": "2026-10-16T11:30:00",
  "executed_by": "Your name", "environment": "local http://localhost:3000",
  "actual": "Publish button visible in the header of a DRAFT course",
  "evidence": "test-evidence/browser/2026-10-16_ins-003.png", "failure_details": "See DEF-001" }
```

Then run `npm run test:tracker`.
A PASS or FAIL without `actual` or `evidence` is rejected.
A BLOCKED entry must give its reason in `failure_details`.

## Adding tests

- **Unit tests:** add a `src/**/__tests__/*.test.js` that prints `[PASS] name` / `[FAIL] name`, like the existing ones. The next sync picks it up as `TC-UT-*` rows.
- **Code-level, HTTP or browser cases:** add an entry to `catalog.py` with a new, never-reused ID. To retire one, set `"retired": True` rather than deleting it.

## Limitations

- **Browser cases are not automated.** They are only recorded through `manual-results.json`.
- **Code-level checks prove source structure, not runtime behaviour.**
- **Earlier deployed results.** Results recorded before 2026-10-15 15:30 came from the Vercel deployment. Their evidence names it.
- **The backend repository (`backend/lms-api`) is out of scope.**
