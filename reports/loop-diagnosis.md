# Diagnosis Report — Console History & Render Loop (§14.7 / P0)

**Date**: 2026-08-12  
**Target Screen**: `/console/applications`  
**Status**: TASK 1 Diagnosis Complete — Gate 1 Reached  

---

## 1.1 Fast Refresh Analysis
- **Observation**: Fast Refresh recompilations occur strictly in response to file writes / edits during development. When editing stops, recompilations stop completely within seconds. No background daemon or process is writing to watched project directories.
- **Finding**: Fast Refresh rebuilds during edits were **noise**, not the underlying cause of the infinite navigation storm.

---

## 1.2 Production Build Verification
- **Observation**: Running a production build (`npm run build && npm start`) eliminates HMR entirely.
- **Finding**: The navigation throttling warning (`app-router.tsx:364 Throttling navigation to prevent the browser from hanging at replaceState`) **survives in application code** because of recursive `router.replace()` invocations inside `useEffect` on `/console/applications`.

---

## 1.3 Guilty Component Identification
- **Guilty Component**: **`app/console/applications/page.tsx` (`ApplicationsClient` / `ApplicationsPage`)** & **`components/console/ConsoleShell.tsx` (`ConsoleShell`)**.
- **Root Cause Anatomy**:
  1. `app/console/applications/page.tsx` maintains local `useState` mirrors (`datePreset`, `customFrom`, `customTo`, `filterStage`, `filterJob`, `debouncedQuery`, `page`).
  2. `const resolvedDate = resolveDatePreset(datePreset, customFrom, customTo)` generates a new object identity on every single render.
  3. `fetchApplications` depends on `resolvedDate` / `resolvedDate.from` / `resolvedDate.to`.
  4. `updateUrlParams` depends on `[pathname, router, searchParams]`.
  5. `useEffect` at line 200 executes `updateUrlParams(...)` and calls `router.replace(...)`.
  6. `router.replace` mutates Next.js `searchParams`, which changes the object identity of `searchParams`, triggering a re-render.
  7. The re-render generates a fresh `resolvedDate` object identity, recreating `fetchApplications`, re-triggering the `useEffect`, and calling `router.replace` again in an unbounded cycle (100+ writes in 30s).
  8. Concurrently, `components/console/ConsoleShell.tsx` topbar hardcodes `'Last 7 Days'` and writes `from` and `to` via `handleDatePreset(7)`, directly colliding with the application filter row's default preset `'last30'`.

---

## 1.4 Date Filter & Database Record Analysis
- **SQL Executed**:
  ```sql
  SELECT count(*) AS total,
         count(*) FILTER (WHERE submitted_at >= now() - interval '30 days') AS in_window
  FROM applications;
  ```
- **Result**:
  ```json
  { "total": 1, "in_window": 1 }
  ```
- **Finding**:
  - `total > 0` AND `in_window > 0` (1 record exists in Neon within the 30-day window).
  - The apparent `0 records` in the screenshot was caused by:
    1. Collision between Top Bar preset (`Last 7 Days`) and Filter Row preset (`Last 30 Days`).
    2. Half-open interval boundary mismatch where the upper bound must strictly evaluate `[istDayStart(from), istDayEndExclusive(to))`.

---

## 🛑 GATE 1 SUMMARY

1. **1.1**: Fast Refresh stops when editing stops (it was noise).
2. **1.2**: Loop is in application code and survives in production build.
3. **1.3**: Guilty components are `app/console/applications/page.tsx` (effect writing URL from state) and `components/console/ConsoleShell.tsx` (competing topbar date range state).
4. **1.4**: `total = 1`, `in_window = 1` — Database has 1 record; date boundary must be half-open `[istDayStart(from), istDayEndExclusive(to))` with single ownership.
