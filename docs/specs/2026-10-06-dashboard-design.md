# RUF Support-Raising Dashboard — Design & Implementation Plan

## Context
Marcus is raising support for a 2-year RUF internship and wants a fun, interactive dashboard to track progress, shareable with one other person. Current targets (all must be editable without code changes):

| Milestone | Metric | Target | Due |
|---|---|---|---|
| Y1 minimum acceptable | Y1 pledged | 75% of Y1 goal ($60k) | 2027-09-01 |
| Cash floor | Received (actual $) | $12,000 | 2027-09-01 |
| Y1 fully pledged | Y1 pledged | $80,000 | 2027-10-01 |
| Y2 fully pledged | Y2 pledged | $80,000 | 2028-10-01 |

Decisions from Q&A:
- **Google Sheet is the source of truth** (Marcus edits data there; the dashboard is read-only).
- **Private sharing via Google sign-in**: static site + Google OAuth (read-only Sheets scope). Only people the Sheet is shared with can see data.
- **Allocation rule**: money goes to Y1 first; Y1 surplus rolls into Y2. Recurring payments that land in the Y2 period count to Y2 (not available in Y1). Most gifts are one-time lump sums; recurring/multi-year is rare.
- **Include an ask pipeline** (people to ask → asked → … → pledged/declined) with weighted projections.
- Functionality first; visual design later (plain CSS, minimal styling).
- Empty directory, no git repo → greenfield; `git init` at start.

## Architecture
Vite + React + TypeScript SPA, no backend. Layers:

```
src/
  domain/        # PURE logic, no React/IO — fully unit-tested
    types.ts       Year, Milestone, Pledge, Gift, Ask, Stage, Workbook, ParseIssue
    parse.ts       raw sheet rows (string[][]) -> typed records + ParseIssue[] (bad rows are reported, not fatal)
    schedule.ts    expand pledges into dated money events (one-time / recurring)
    allocate.ts    bucket events into Y1/Y2 by date + Y1 overflow -> Y2
    metrics.ts     snapshot(workbook, asOfDate, whatIf) -> totals, milestone statuses, pace, projections
    timeline.ts    daily/weekly series for charts (pledged, received, required-pace line, projection)
  data/
    source.ts      interface WorkbookSource { load(): Promise<RawWorkbook> }
    googleSheets.ts  Sheets API v4 values:batchGet for all tabs in one request
    sample.ts      bundled fixture data (demo mode, dev without auth, tests)
  auth/google.ts   Google Identity Services token client (scope spreadsheets.readonly), in-memory token, silent re-auth
  ui/            components (below)
  App.tsx        loads source -> domain snapshot -> UI; refresh button + 5-min auto refresh
scripts/make-template.ts   generates template/RUF-Funding-Template.xlsx (tabs, headers, dropdown validation, sample rows)
docs/SETUP.md              Google Cloud OAuth + Sheet + deploy steps
```

Config (non-secret, build-time env, overridable via `?sheet=` URL param): `VITE_GOOGLE_CLIENT_ID`, `VITE_SHEET_ID`. `?demo` loads sample data with no sign-in.

## Google Sheet template (6 tabs)
All goals/dates/probabilities live in the Sheet so "subject to change" = edit a cell.

- **Years**: `Year` (Y1/Y2) · `Goal` · `Funds Start` (date the year's money period begins; defaults Y1 = today-ish, Y2 = 2028-10-01 — *assumption, editable*).
- **Milestones**: `Label` · `Metric` (dropdown: `y1_pledged`, `y2_pledged`, `received`) · `Target` (`$60000` or `75%` = % of that year's goal, so changing the goal updates it) · `Due` · `Kind` (`minimum` / `goal`). Pre-filled with the 4 rows above.
- **Pledges**: `ID` (P001…) · `Donor` · `Kind` (one-time / recurring) · `Amount` (per payment) · `Frequency` (monthly/quarterly/annually; recurring only) · `Committed On` · `Expected Date` (one-time) or `Start`/`End` (recurring; blank End = through end of Y2) · `Status` (active / cancelled) · `Notes`.
- **Gifts** (money actually received): `Date` · `Donor` · `Amount` · `Pledge ID` (optional dropdown) · `Notes`.
- **Pipeline**: `Name` · `Stage` (dropdown from Stages) · `Ask Amount` · `Next Step` · `Next Step Date` · `Last Contact` · `Notes`.
- **Stages**: `Stage` · `Probability` · `Open?` — defaults: To Ask 10%, Asked 30%, Meeting Set 40%, Considering 60%, Pledged (closed), Declined (closed).

## Core calculation rules (domain/)
1. **Money events**: active pledge → its schedule (one-time: Expected Date; recurring: every occurrence Start..End). Cancelled pledge → only its linked gifts. Gift with no Pledge ID → counts as both a pledge and received (event at gift date, committed on gift date).
2. **Bucketing**: event date < Y2 `Funds Start` → Y1 bucket, else Y2 bucket. Then `overflow = max(0, Y1 − Y1 goal)` moves to Y2. (Generalized to N years as a chain.)
3. **As-of date**: pledged-as-of(D) includes only pledges with `Committed On ≤ D`; received-as-of(D) = gifts dated ≤ D. Enables history charts and a time-travel scrubber.
4. **Milestone status**: `met` (value ≥ target) · `on track` (current + trailing-60-day pace × days left ≥ target) · `at risk` · `missed` (past due, unmet). Also shows required $/week to hit it.
5. **Pipeline projection**: Σ open asks × stage probability, added in as a separate "likely" layer (never mixed into pledged totals).
6. **What-if** (UI-only, not written to Sheet): pipeline conversion % slider, hypothetical extra gift(s) → recompute snapshot live.

## UI (functional, minimal styling)
- **Header**: sign in/out, Sheet name, last refreshed, refresh button, demo badge.
- **Milestone cards**: countdown (days left), progress bar, status chip, required pace/week; confetti (`canvas-confetti`) the first time a milestone flips to met (remembered in localStorage).
- **Year progress bars** (Y1, Y2): stacked received → pledged → pipeline-weighted, with goal line, 75% marker, and overflow-to-Y2 indicator.
- **Timeline chart** (Recharts): cumulative pledged & received over time, milestone markers, required-pace line, dashed projection to each due date.
- **As-of scrubber**: drag through time to see the dashboard on any past date.
- **What-if panel**: sliders described above.
- **Pipeline board**: columns by stage with totals; overdue next steps highlighted; sortable list view.
- **Pledges / Gifts tables**: search + sort, per-donor totals, which year each dollar landed in.
- **Data issues panel**: rows that failed to parse (bad date, unknown stage, gift linked to missing pledge ID) with tab + row number.

## Implementation steps
1. `git init`; scaffold Vite React-TS; add Vitest, Recharts, canvas-confetti, exceljs (dev, for template script). Copy this design to `docs/specs/2026-10-06-dashboard-design.md`.
2. `domain/` types + parser with tests (TDD): date/currency parsing ("$1,200", "75%", Sheets serial dates/ISO/US formats).
3. `schedule.ts` + `allocate.ts` with tests (lump sums overflow Y1→Y2; recurring split across the Y2 boundary; cancelled pledge; unlinked gift; Y2 surplus).
4. `metrics.ts` + `timeline.ts` with tests (milestone statuses, % targets resolving against goals, pace, projections, as-of behavior).
5. Sample fixture data + `SampleSource`; build the UI against `?demo` first.
6. `auth/google.ts` + `GoogleSheetsSource`; sign-in flow, error states (no access to sheet → clear message, token expiry → silent re-auth).
7. `scripts/make-template.ts` → `.xlsx` with headers, dropdowns, sample rows (Marcus uploads to Drive → "Save as Google Sheets"). Optionally I can create it directly via the Google Drive connector if you want — I'll ask first.
8. `docs/SETUP.md`: create Google Cloud project, OAuth consent screen (Testing mode; add yourself + the viewer as test users), Web client ID with authorized JS origins (localhost + deploy URL), enable Sheets API, share the Sheet with the viewer, deploy (GitHub Pages via Actions workflow, or Vercel).
9. GitHub Actions workflow for Pages deploy (`.github/workflows/deploy.yml`), reading env from repo variables.

## Verification
- `npm test` — domain unit tests cover every allocation/milestone rule above with worked examples (e.g. $85k one-time pledged before Y2 start → Y1 $80k, Y2 $5k).
- `npm run build` and `npm run lint`/`tsc --noEmit` clean.
- `npm run dev` → open `/?demo`: verify cards, charts, scrubber, what-if, pipeline, data-issues panel render and recompute (I'll run it locally and check for runtime errors).
- Template: run `npm run template`, open the xlsx to confirm tabs/dropdowns.
- Live OAuth path requires your Google Cloud client ID → you follow SETUP.md, then sign in and confirm real Sheet data loads; a second Google account without Sheet access should see the "no access" message.

## Assumptions to confirm/adjust later (all editable in the Sheet)
- Y2 money period starts 2028-10-01 (matches the Y2 deadline). If Y1 actually ends earlier (e.g. Aug 31, 2028), change `Funds Start` for Y2.
- "Pledged" includes money already received.
- Recurring pledges with blank End run through the end of the last year.
