# TRIAGE — Baseline QA Run

**Baseline SHA:** `e97f3e298f51a4098c6527146809bdacf337816e`
**Run:** `reports/qa-20260811-102149/` (local, `scripts/qa.sh`, no target arg)
**Scope note:** Neon branching, Vercel preview deploy, and k6 load testing were
**skipped by user decision** — `neonctl`, `vercel`, and `k6` are not installed
in this environment, and `.env.local` has only one `NEON_DATABASE_URL` with no
branch separation. Everything else ran against localhost / the existing DB
(db-audit is read-only). This is a scope reduction from Document 8 Part 19,
not a silent one — recorded here and in the final report.

## Gate summary (unfiltered)

| Gate | Result |
|---|---|
| 0-build-typecheck | FAIL |
| 0-build-lint | FAIL |
| 0-build-unit | PASS |
| 0-build-production | FAIL |
| 1-css-emitted | PASS (88,871 bytes, floor 15,360) |
| 2-database | PASS |
| 3-design-integrity | FAIL (cascade — no build) |
| 4-functional | FAIL (cascade — no build) |
| 5-performance | FAIL (independent cause) |
| 6-secret-hygiene | FAIL |

Note on methodology: `qa.sh`'s `run_gate` helper only prints the **last 20
lines** of each log to the console. The typecheck failure list in the console
output looked like test-file noise only. Reading the full log
(`00-typecheck.log`) surfaced three real application-code defects that the
truncated view hid entirely. Full logs, not console tails, were used for
every root-cause statement below.

## Findings, grouped by root cause

### F1 — P0 — Build-breaking wrong import path
**Gate(s):** 0-build-production, 3-design-integrity, 4-functional, 5-performance (all four are one root cause, not four)
**File:** `app/api/status/lookup/route.ts:13`
**Symptom:** `next build` fails: `Module not found: Can't resolve '@/lib/validation/normalisers'`. Because no valid `.next` production build exists, `npm start` (used as Playwright's and Lighthouse's `webServer`) fails to boot, which is why gates 3, 4, and 5 also show FAIL — they never got a server to test against.
**Root cause:** `normaliseEmail` is exported from `lib/validation/shared.ts`, not a `lib/validation/normalisers.ts` module, which doesn't exist. Wrong import path, introduced when this route was added.
**Fix approach:** Change the import to `@/lib/validation/shared`. One-line fix; re-verify build, then re-run gates 3/4/5 which should recover once the build succeeds.

### F2 — P1 — CSV export endpoint broken at runtime
**Gate:** not caught by any current test (no e2e coverage hits this route) — found via typecheck
**File:** `app/api/console/exports/route.ts:18,28,54`
**Symptom:** `getApplicationsList()` returns `PaginatedApplicationsResult` (`{ applications: any[], totalCount, page, pageSize, totalPages, hasMore }`), but the route treats the whole return value as the array itself (`apps.length`, `apps.map(...)`). At runtime this throws (`apps.map is not a function`), caught by the route's own try/catch, returning `500 { error: 'Export failed' }` on every call.
**Root cause:** `getApplicationsList` was refactored to return pagination metadata alongside the array; this call site was not updated to match.
**Fix approach:** Read `apps.applications` instead of `apps` in both the audit-log `recordCount` and the `.map()` call. Add a regression test hitting `GET /api/console/exports` as a recruiter, asserting `200` and a non-empty CSV body — this defect had zero test coverage.

### F3 — P1 — Admin password-rotation script writes a non-existent column, and hardcodes a second, different weak password with no env override
**Gate:** not caught by any current gate — found via typecheck
**File:** `scripts/set-admin-password.ts:22,42`
**Symptom:** TS2353 — `updatedAt` is not a column on `users` (checked `lib/db/schema.ts:223-240`: `users` has `passwordChangedAt`, not `updatedAt`; `updatedAt` only exists on `candidates` and two other tables). Separately, the script hardcodes password `'admin123'` with **no `SEED_ADMIN_PASSWORD`-style env override**, unlike `scripts/seed-admin.ts` (which defaults to `Admin@123` but respects `process.env.SEED_ADMIN_PASSWORD`). Two different hardcoded admin passwords exist in this repo across two scripts.
**Root cause:** Copy-paste/typo (`updatedAt` vs `passwordChangedAt`) plus a script written without the env-override pattern its sibling script already established.
**Fix approach:** Change `updatedAt: new Date()` → `passwordChangedAt: new Date()`. Change the hardcoded `'admin123'` to `process.env.SEED_ADMIN_PASSWORD || 'admin123'` matching `seed-admin.ts`'s pattern, so a real rotation can actually happen via env var instead of this script being a second permanent backdoor. Flagged for §19.7 (secret hygiene / password rotation) either way.

### F4 — P2 — `noUncheckedIndexedAccess` not accounted for in newly-written test/QA-script code
**Gate:** 0-build-typecheck
**Files:** `tests/e2e/control-sizing.spec.ts`, `tests/e2e/sync-consistency.spec.ts`, `tests/security/authz-matrix.spec.ts`, `tests/security/upload-hardening.spec.ts`, `tests/unit/normalisers.property.test.ts`, `scripts/benchmark-concurrency.ts`, `scripts/verify-candidate-cooldown.ts`, `app/api/console/exports/route.ts` (unrelated instance), `app/dashboard/page.tsx` (exactOptionalPropertyTypes variant)
**Symptom:** ~30 `TS18048`/`TS2345`/`TS2322` errors, all "possibly undefined" or "string | undefined not assignable to string."
**Root cause:** `tsconfig.json` has `noUncheckedIndexedAccess: true` and `exactOptionalPropertyTypes: true` (both correct, intentional strict settings). Every array index (`arr[i]`), `.returning()`/`.select()` destructure, and regex match-group access is typed `T | undefined` under this flag. All the new test/QA files were written assuming plain `T`. This is **not a runtime bug** in any of these cases I inspected (`lib/auth/candidate-password.ts`'s `cand`/`candidate`/`fifthFailure` are all logically guaranteed non-undefined at each access point) — it's a systemic gap between how strict this tsconfig is and how the new files were written.
**Fix approach:** Narrow at each site (`if (!x) throw`, or non-null assertion where a length/existence check already logically guarantees it three lines up). For `lib/auth/candidate-password.ts` specifically, add an explicit `if (!candidate) return { success: false, error: 'INVALID_CREDENTIALS', ... }` guard after the login-attempt log — not because the current logic is wrong, but because it currently relies on an implicit correlation between `loginSucceeded` and `candidate` being defined that TS (correctly) can't verify, and a human re-reading this file six months from now shouldn't have to re-derive that proof either.

### F5 — P2 (blocks the gate, not the app) — `lighthouserc.js` is CommonJS in an ESM package
**Gate:** 5-performance
**File:** `lighthouserc.js:17` (`module.exports = {...}`)
**Symptom:** `module is not defined in ES module scope` — independent of F1; this gate would still fail even with the build fixed.
**Root cause:** `package.json` declares `"type": "module"`, so Node treats every `.js` file as ESM. `lighthouserc.js` uses CommonJS syntax.
**Fix approach:** Rename to `lighthouserc.cjs` (forces CommonJS regardless of package `type`) and update the one reference in `scripts/qa.sh:141`.

### F6 — P1 — Secret-hygiene gate correctly caught a hardcoded literal
**Gate:** 6-secret-hygiene
**File:** `tests/security/authz-matrix.spec.ts:84,421`
**Symptom:** Grep for the seeded admin password finds it hardcoded in a checked-in security-test file, outside the two allowlisted homes (`scripts/seed-admin.ts`, `scripts/qa.sh`).
**Assessment (§19.5 protocol):** This is **not a bad test.** The gate is doing exactly what it's for. `'admin@gmail.com'` / `'Admin@123'` is hardcoded directly rather than read from `process.env.SEED_ADMIN_PASSWORD`, which every other script in this repo already does.
**Fix approach:** Read the password from `process.env.SEED_ADMIN_PASSWORD || 'Admin@123'` in the test, matching `seed-admin.ts`'s own pattern. This still won't fully silence the grep (the fallback literal string still appears in source), so the **narrowest correct change** is adding `tests/security/authz-matrix.spec.ts` to `qa.sh`'s existing allowlist (currently just `seed-admin.ts` and `qa.sh` itself) — same justification the script already accepts for those two files: a known, non-secret, local-dev-only default that's meant to be overridden via env in any real deployment.

### F7 — P2 (backlog, not blocking) — Pre-existing lint debt, out of campaign scope
**Gate:** 0-build-lint
**Files:** ~40 files across `app/console/**`, `lib/**`, `scripts/**` — 117 errors / 91 warnings total.
**Symptom:** Two dominant patterns: (a) `@typescript-eslint/no-explicit-any` scattered across route handlers and console pages, largely predating this session's diff (most `app/console/*/page.tsx` files are untouched in the current branch's history); (b) `react-hooks/set-state-in-effect` — nearly every console admin page calls a `fetchX()` function synchronously inside a bare `useEffect(() => { fetchX() }, [])`, flagged uniformly across ~13 files by what looks like a newer eslint-plugin-react-hooks rule.
**Root cause:** Pre-existing technical debt, not a regression from Document 7 or the candidate-auth work. The `react-hooks/set-state-in-effect` pattern in particular is one mechanism repeated ~13 times (a shared data-fetching convention across the admin console), not 13 independent bugs.
**Decision:** Out of scope for this campaign. Per the brief's own rule ("don't fix P2s while a P0 is open," "don't improve code you weren't sent to fix"), this is recorded as backlog, not fixed here. It does not block the launch decision on its own — nothing in it is a security, correctness, or data-integrity defect; it's lint discipline. Flagging the `react-hooks/set-state-in-effect` pattern as worth a dedicated pass later, since fixing it 13 times individually would itself violate "one root cause per commit" if bundled with anything else.

### F8 — P2 — CSV export silently caps at 50 records (found while fixing F2, not fixed)
**File:** `app/api/console/exports/route.ts:18` calling `getApplicationsList({ stage, jobId })`
**Symptom:** `getApplicationsList` defaults `limit` to 50 (`Math.min(Math.max(Number(filters.limit) || 50, 1), 200)`) and the exports route never overrides it. Even after F2's fix, a CSV export of a filter matching more than 50 applications would silently return only the first 50, with no indication in the response that it was truncated.
**Root cause:** distinct from F2 — F2 was reading the wrong property off the result; this is the underlying query being called with an implicit page-1-of-50 instead of "everything matching this filter."
**Decision:** Not fixed in this pass — recorded so it isn't bundled into F2's commit (one root cause per commit) and doesn't get lost. Recommend `getApplicationsList` grow an explicit "no pagination, return all matching rows" mode for the export path specifically, since exports and paginated UI listing have different correctness requirements.

### F9 — P0-class (build-blocking) — `exactOptionalPropertyTypes` violation in candidate dashboard
**Gate:** 0-build-typecheck (also blocks `next build`, discovered mid-fix: see note below)
**File:** `app/dashboard/page.tsx:39-45`
**Symptom:** `checkApplicationEligibility()`'s return type has `reason`/`message`/`reapplyAvailableAt`/`daysRemaining` typed as `X | undefined`, spread directly into `initialEligibility={{ ... }}` whose prop type declares them as optional (`reason?: string`). Under `exactOptionalPropertyTypes: true`, explicitly assigning `undefined` to an optional property is a distinct type error from omitting the key.
**Root cause:** Same tsconfig-strictness gap as F4, but in real (uncommitted-until-now) app code, not test code — worth calling out separately because it's on the actual candidate dashboard render path, not a test file.
**Fix approach:** Conditionally spread each optional key instead of always including it with a possibly-`undefined` value.

**Correction to the original plan:** F1 was believed to be the sole cause of the build failure. It was necessary but not sufficient — `next build` in this project also runs a full-project `tsc` pass (not scoped to `app/`), so every F4/F9 fix was *also* required before the build could succeed, not just before `npm run typecheck` could pass. Discovered by re-running `npm run build` after the F1 fix alone and seeing it fail on F4-class errors instead. Recorded here rather than silently revising history, per verification-before-completion: the plan was wrong, and re-running is what caught it.

---

## Round 2 — findings surfaced only after F1 unblocked the build

Gates 3 (design-integrity), 4 (functional), and 5 (performance) had **never
actually run** before — F1 blocked the production build, so their Playwright
`webServer` never started. Re-running the full suite after F1/F3/F4/F6/F9
surfaced real, previously-invisible signal. `0-build-typecheck`,
`0-build-production`, and `6-secret-hygiene` are now confirmed PASS by this
same re-run — F1/F4/F6/F9 verified, not just asserted.

### F10 — RESOLVED — `[data-card-meta]` attribute missing from job cards (universal, all 6 browser projects)
**Gate:** 3-design-integrity — `card meta rows (footer) align to the same baseline within a row`
**Evidence:** `Error: expected at least one [data-card-meta] row / Received: 0` — fails identically on **chromium, firefox, webkit, mobile-chrome, mobile-safari, and tablet**. Not cross-browser flakiness; reproduces on plain Chromium too.
**Root cause, confirmed by a repo-wide grep:** the attribute doesn't exist anywhere in the codebase — never implemented, not dropped by a refactor.
**Fix:** added `data-card-meta` to the location/two-wheeler-badge row in `app/careers/page.tsx`'s job card markup — the natural "meta/footer" info row the test's name describes.
**Caveat, not fully resolved in principle:** the test's own comment assumes a 3-up grid at 1440px ("All cards in this grid are in one row"), but the page actually ships a single-column stacked list (`flex flex-col md:flex-row` per card). The assertion (`<=2` distinct row-tops) passes today only because there are exactly **2** seeded jobs — a single-column list's distinct-row count scales 1:1 with card count, unlike a true grid's. **A 3rd job posting will fail this test again.** Not fixing the layout-vs-test mismatch itself here — that's a real visual-design decision (should `/careers` actually be a 3-up grid at desktop widths?) that wasn't this campaign's to make unilaterally. Flagging for a product/design decision, not silently patching around it.
**Verification:**
```
$ npx playwright test tests/e2e/design-integrity.spec.ts --grep "card meta"
6 passed (5.9s) — all 6 browser projects
```

### F11 — RESOLVED — 10 tap targets under 44×44px on mobile (390px), universal, all 6 browser projects
**Gate:** 3-design-integrity — `every tap target is at least 44×44px on mobile (390px)`
**Evidence (identical on chromium and firefox, so confirmed real, not flaky):**
`"Open Roles" 105×42`, `"Apply Now →" 300×36` (×2), 4× `SPAN` 32×10/10×10, `"← Prev"` 80×36, `"Next →"` 80×36, `"AaksharaCAREERS"` wordmark link 350×32.
**Root cause:** all height-only violations (widths fine). `control-sizing.spec.ts` (§18.6, Document 7's remediation) only asserts a **ceiling** (controls stay under 64px) and a boxy-ratio check — it never asserted a 44px **floor**, so the WCAG 2.5.5 minimum was never actually covered:
- `"Apply Now →"`, `"← Prev"`, `"Next →"` all share `.btn--sm` (`app/globals.css`), which was `height: 36px`. One shared class, three symptoms — same "check every consumer of a shared token" lesson as F1/F4.
- 4 small `SPAN`s were the `HiringProcessCarousel` step-indicator dots (`h-2.5`/`w-2.5`, 10px) — correctly small *visually*, but the interactive element itself (the same span) inherited that size as its hit area too.
- `"Open Roles"` nav link (`components/layout/Header.tsx`) — plain `px-3 py-2` text link, no explicit height, rendered ~42px.
- `"AaksharaCAREERS"` wordmark — **two separate, undeduplicated copies** of the same brand link markup, one in `Header.tsx`, one in `Footer.tsx`. Fixing the header's copy alone left the footer's copy still failing — worth flagging as a DRY gap (a shared `<BrandLink>` component would prevent this exact "fixed it in one place, missed the duplicate" class of bug going forward), not fixed here since that's a refactor beyond this campaign's scope.

**Fixes:**
- `.btn--sm` height 36px → 44px (`app/globals.css`) — fixes 3 of the 10 in one place.
- Carousel dots: restructured so a 44×44px transparent outer `<span role="button">` carries the hit area and keyboard/click handlers, with the small 10px colored dot as a decorative `aria-hidden` inner span — visual design unchanged, tap target now compliant.
- Header + Footer wordmark links, and all 3 header nav links: added an explicit `min-h-[44px]` (Tailwind's bare `min-h-11` didn't resolve under this project's custom ordinal spacing scale — same class of gotcha Document 7 already fought once; used an arbitrary-value `[44px]` to bypass it entirely rather than debug the token mapping further).

**Verification (against the real production build, `npm start`, not dev mode):**
```
$ npx playwright test tests/e2e/design-integrity.spec.ts --project=chromium --grep "44×44px"
1 passed
```
A stray Next.js dev-mode toolbar button (32×32, `npm run dev` only) showed up as an 11th false-positive mid-investigation — confirmed absent from the production build, not fixed as app code because it isn't app code.

Full regression sweep (`design-integrity.spec.ts` + `control-sizing.spec.ts`, all 6 browsers, production build): **175 passed**, 5 failed — all 5 are `page.goto` timeouts or context-teardown timeouts on Firefox/mobile-chrome, re-ran individually and passed cleanly in isolation (Firefox) or showed the identical timeout signature with zero plausible causal link to CSS/markup changes (mobile-chrome). Consistent with the already-documented F13 environment-flakiness pattern in this Windows sandbox, not a regression — extending F13's scope below to cover mobile-chrome, not just Firefox.
**Not yet fixed** — flagged for decision below.

### F12 — RESOLVED (2026-08-11, second pass) — two real bugs, neither was the off-by-one first assumed

**Update:** the original write-up below misread which assertion actually failed (attributed a post-loop check to being inside the loop) and concluded there was a counting off-by-one. There wasn't — a hand-traced walkthrough of `loginCandidate()`'s arithmetic, then a direct-fetch reproduction script hitting the real API 7 times in sequence, both confirmed the count logic is correct: 5 logged failures correctly trigger `RATE_LIMITED` on attempt 6 and every attempt after. Two different, real bugs were actually responsible:

**F12a — test isolation:** `playwright.config.ts` runs `fullyParallel: true` across 6 browser projects. `candidate-auth.spec.ts` hardcoded one phone number and one email for all of them. Concurrent projects shared the same `candidates` row and `candidate_login_attempts` rows — one project's `beforeAll` cleanup could delete another's in-flight attempt count mid-test, and `candidates.emailNormalised`'s unique constraint made two concurrent signups with the same email collide outright (surfacing as a signup→`/dashboard` redirect timeout, not a lockout symptom). Fixed by deriving `testPhone`/`testPhoneE164`/`testEmail` from `testInfo.workerIndex` in `beforeAll`, so parallel workers never share rows.

**F12b — real product bug, IP-key fragility:** after fixing F12a, the test still failed deterministically on Firefox alone (not a concurrency artifact — reproduced with `--project=firefox` run in total isolation). Root-caused with a direct-fetch reproduction script (bypassing the browser and Playwright's API context entirely) that confirmed the server-side logic is correct when the same client makes every call. The actual cause: `app/api/auth/candidate/login/route.ts` (and identically, `app/api/auth/login/route.ts`) keys the rate limit on a raw `x-forwarded-for` / `x-real-ip` / `'127.0.0.1'` string with **no normalization**. On this machine, "localhost" resolves to different loopback representations (`127.0.0.1` vs `::1`) depending on which network stack resolves it — Firefox's own engine resolved differently than Playwright's Node-based `page.request` API context used for the test's final direct-API check. The 5 logged failures and the final lockout check ended up keyed on two different IP strings for the same real client, so the final check saw 0 matching failures and let a request through that should have been blocked. This isn't purely a local-dev artifact — any dual-stack client, proxy, or load balancer that can present the same connection over either IPv4 or IPv6 has the identical fragility against a literal string-equality rate-limit key.

**Fix:** new `lib/security/client-ip.ts` (`getClientIp` + `normalizeIp`) collapses `::1` → `127.0.0.1` and unwraps IPv4-mapped IPv6 (`::ffff:x.x.x.x`) before the string is ever used as a rate-limit key. Wired into both login routes, replacing their inline extraction.

**Verification:**
```
$ npx playwright test tests/e2e/candidate-auth.spec.ts --reporter=list
Running 6 tests using 6 workers
6 passed (22.6s)
```
All 6 browser projects pass together — the exact scenario (parallel, all engines) that originally failed.

<details><summary>Original write-up (superseded, kept for the record — the off-by-one it describes does not exist)</summary>

### F12 (original) — P1 — Candidate login lockout is off-by-one: blocks the 6th failed attempt, not the 5th
**Gate:** 4-functional — `candidate-auth.spec.ts` "Valid signup, duplicate signup auto-redirect, and login lockout", **reproduces on chromium** (not browser flakiness)
**Evidence:** test submits 5 consecutive wrong passwords and expects the 5th response to say "Too many failed login attempts." Actual 5th response: `"Invalid phone number or password."` (200/normal invalid-credentials path).
**Root cause, confirmed by reading `lib/auth/candidate-password.ts` `loginCandidate()`:** the lockout check (`if (failures.length >= MAX_FAILED_ATTEMPTS)`) runs against failures **already logged from previous requests**, then the current attempt is logged *after* that check. So on the Nth failed attempt, the check only sees N-1 prior failures — lockout doesn't actually engage until the (MAX_FAILED_ATTEMPTS + 1)th request, one request later than the stated 5-attempt policy. A 6th wrong password gets through with a normal error message instead of being blocked; the account is only actually rate-limited starting on attempt 6.
**Fix approach:** decide whether "MAX_FAILED_ATTEMPTS" means "5 wrong attempts allowed, 6th blocked" (current behavior, in which case the test's expectation is wrong) or "block starting on the 5th wrong attempt" (test's expectation, in which case the check needs to count the in-flight attempt). Given the brief's P1 framing of rate-limit precision as a real control, and that the test's stated intent (§ security spec docstring: "brute-force rate-limiting") reads as "5 wrong attempts is the limit," the code should change, not the test: check should become `failures.length >= MAX_FAILED_ATTEMPTS - 1` so the current (Nth) attempt, once logged, would be the one that reaches the cap — i.e. block *before* running verifyPassword on an attempt that would become the 5th logged failure.

*(This diagnosis was wrong — see the resolution above.)*

</details>

### F13 — Environment limitation, not a product defect — Firefox headless crashes + intermittent mobile-chrome launch timeouts on this Windows sandbox
**Gate:** 3-design-integrity, 4-functional (Firefox- and, less often, mobile-chrome-only failures)
**Evidence:** Firefox browser logs show `RenderCompositorSWGL failed mapping default framebuffer, no dt` (no drawing target) and `GraphicsCriticalError` immediately after launch, followed by `page.goto` timeouts and `Tearing down "context" exceeded the test timeout` on otherwise-unrelated tests (container alignment, section padding, font loading, heading text-wrap, CLS). Re-run individually, these pass cleanly (confirmed during F11's verification: `Wordmark contrast`, `section padding symmetric` both green in isolation).

**Update (F11 verification pass):** the same signature — bare `page.goto: Test timeout of 30000ms exceeded` with no assertion ever reached — also showed up on **mobile-chrome**, 3 tests, reproducing even in total isolation (single test, single project, 3 consecutive attempts). Server itself confirmed healthy throughout (`curl http://localhost:3000/careers` → 200 the entire time). No plausible mechanism connects F11's changes (CSS height on `.btn--sm`, a `min-h-[44px]` utility, restructured carousel-dot markup) to a browser failing to complete network navigation — grouping this under F13 rather than opening a new investigation, since the actual cause is browser-launch/resource instability in this sandbox, same category as Firefox's, just a different engine and less consistently reproducible.

**Assessment:** headless Firefox failing to acquire a software/GPU rendering surface, and Chromium-mobile-emulation intermittently failing to complete `page.goto` — both environment/tooling limitations in this specific Windows sandbox, not rendering defects in the app. The same assertions pass cleanly on chromium, webkit, mobile-safari, tablet, and pass on mobile-chrome most of the time.
**Decision:** not investigated further as a product bug. Recorded so red Firefox/mobile-chrome rows in the report aren't misread as app defects. Flagging for the CI wiring step (§19.7): if full cross-browser coverage matters, it needs a Linux/Mac CI runner with real GPU/headless support, not further local debugging here.

### Also observed, not yet root-caused (lower confidence, recorded not chased)
- `console-dashboard.spec.ts` "Command Palette (⌘K)" — `[data-testid="cmdk-trigger"]` never resolves within 30s on **webkit, mobile-safari, tablet** (all WebKit-family engines) but not chromium/firefox/mobile-chrome. Consistent pattern (one engine family) suggests a real WebKit-specific rendering or hydration issue with the command-palette trigger, but not confirmed — could also be an auth/session timing issue specific to WebKit's cookie handling in this test harness.
- `careers-screenshots.spec.ts` Mobile 390px capture — `page.goto` timeout on mobile-chrome only. Single data point, not enough to root-cause yet.
- `sync-consistency.spec.ts` real-time sync propagation — 1 Firefox-only failure, likely F13.

---

## Round 3 — security suite (E5)

`upload-hardening.spec.ts`: **all 14 tests PASS.** Malicious payload rejection (webshell, polyglot, zip-bomb header, EICAR, SVG-with-script, double extension, null byte, path traversal, empty/oversized file), uploadId session-binding, server-generated object keys, and `Content-Disposition: attachment` all hold.

`authz-matrix.spec.ts`: **6 of 50 tests failed.** Investigated each before drawing any conclusion (§19.5/systematic-debugging) — they are not one thing.

### F14 — RESOLVED (2026-08-11, second pass) — admin login fixture credential mismatch + a test-harness footgun

**Update:** fixed. Two layered causes, both resolved:
1. `scripts/set-admin-password.ts`'s default (`admin123`) didn't match `scripts/seed-admin.ts`'s (`Admin@123`) — see original write-up below. Fixed by standardizing both scripts on `Admin@123` and adding a same-commit-sync comment to each; live DB password re-synced via `npx tsx scripts/set-admin-password.ts`.
2. After fixing (1), 5 tests still failed — but on a *different* symptom (`qa-fixtures` endpoint 404, not admin-login 401). Root-caused before touching any product code (systematic-debugging): a stray `npm start` (production) server, left running from earlier manual `curl` verification, was silently reused by Playwright's `reuseExistingServer: true` instead of the `npm run dev` server `playwright.security.config.ts` actually specifies. `next start` always sets `NODE_ENV=production`, which correctly triggered `qa-fixtures`'s "404 in production" guard — the guard was never broken. Killing the stray server and letting the suite spawn its own dev server resolved it with **zero product code changes**. Added a warning comment to `playwright.security.config.ts` so this footgun doesn't cost someone else an hour.

**Verification — full re-run, clean environment:**
```
$ npm run test:security
50 passed (48.1s)
```
All 4 P0 IDOR checks (cross-drive scoping, status-token PII leak, adjacent/truncated token rejection) now pass for real, on their actual assertion. The IDOR class is genuinely verified, not just unblocked.

<details><summary>Original write-up (superseded, kept for the record)</summary>

### F14 (original) — Not a security vulnerability, but blocks verifying one — admin login fixture credential mismatch
**Tests affected:** 4 of the 6 failures are IDOR-tagged (`C — IDOR: object-level authorization (P0)`: cross-drive application access, status-token PII leak, adjacent/truncated token rejection) plus the fixtures-endpoint production-guard test. All fail identically at `loadFixtures()`'s admin login step with `401`, **before ever reaching their actual IDOR assertion.**
**Root cause, confirmed by direct curl:** `SEED_ADMIN_PASSWORD` is not set in `.env.local`. `authz-matrix.spec.ts`'s new F6 fallback assumes `Admin@123` (matching `scripts/seed-admin.ts`'s default). The admin account actually live in this database has password `admin123` (`scripts/set-admin-password.ts`'s default — confirmed: `curl .../login -d '{"email":"admin@gmail.com","password":"admin123"}'` → 200; `Admin@123` → 401). Two scripts, two different hardcoded defaults, no single source of truth for "what is the admin password right now," and nothing reconciles them.
**Consequence:** this is not proof of an IDOR vulnerability — it's proof the test never got to check. 4 of the P0-tagged authorization checks in this campaign are **unverified, not passing.** `C — Application detail with a fabricated UUID returns 404` (the one IDOR test that logs in as a *recruiter*, not admin) did pass, which is a positive data point, but it's the weakest of the five IDOR checks.
*(Original "not fixed" disposition — superseded above.)*

</details>

### F15 — RESOLVED — Login-timing oracle: 331ms delta between existing/non-existing accounts (threshold 300ms)
**Test:** `D — Login oracle: generic error body, consistent timing` — this one **did** run its real assertion (doesn't depend on the admin fixture).
**Evidence:** `Timing delta 331ms exceeds 300ms oracle threshold` — average response time for a login attempt against an existing account differs from a non-existing account by 331ms, enough to let an attacker distinguish "this phone/email exists" from "it doesn't" via timing alone.
**Root cause, confirmed by reading `app/api/auth/login/route.ts`:** the route already had a timing mitigation for unknown accounts (dummy Argon2id compare), but the *known-account, wrong-password* branch performs one extra sequential DB write (`users.failedLoginCount`/`lockedUntil` update) that the unknown-account branch didn't have — an asymmetric number of Neon round-trips, not a hashing-cost asymmetry.

**Fix:** added a matching no-op DB write (an update targeting a UUID that can never match a real row, so it always affects 0 rows) to the unknown-account branch, so both branches perform the same number of sequential writes.

**Verification:**
```
$ npm run test:security
Timing oracle check: existing avg=824ms, unknown avg=818ms, delta=6ms
✓ Login response time does not reveal account existence (< 250ms delta)
```
Delta dropped from 331ms (baseline) / 254ms (natural variance, pre-fix) to 6ms post-fix.

## Launch decision — NO GO

Per Document 8 §19.9's own rubric: **NO GO — any open P0.**

The disqualifying item is **F14**, not F10/F11/F12/F15. Those four are real,
confirmed, severity-appropriate (P1) findings the user explicitly chose to
defer for a later session — that's a normal, defensible "ship with a dated
fix commitment" call, and on their own they would support **GO WITH
CONDITIONS**.

F14 is different in kind: it is not a confirmed defect, it's a **hole in the
verification itself**. Four of the five P0-tagged IDOR checks in this
campaign (`Recruiter cannot access application that does not belong to
their drive scope`, `Status token endpoint leaks no internal UUID/email/
phone`, `Adjacent status token probe`, `Truncated status token rejected`)
never reached their real assertion — they errored out at an admin-login
step that fails due to a test-fixture credential mismatch, not app logic.
The fifth IDOR check (fabricated UUID → 404, logged in as a recruiter, not
admin) did pass, which is a positive but partial signal.

**Blast radius in plain language:** we do not currently know whether a
recruiter logged into the console can read another recruiter's candidate
data — resumes, phone numbers, interview notes — across a drive boundary.
The code may well be fine; `Container.tsx`/`Button.tsx`-style propagation
gaps are exactly the kind of thing this campaign exists to catch, and this
class of check simply did not run. Given the explicit brief instruction —
"If any IDOR test fails, stop the campaign and fix it before running
anything else" — and given the user's decision to leave it unresolved
rather than apply the one-line test fixture fix, the honest position is
**NO GO**, not **GO WITH CONDITIONS** downgraded by one severity level.

**Fix estimate:** trivial once prioritized — the diagnosis is already done
(F14 above states the exact root cause and fix). Point
`tests/security/authz-matrix.spec.ts`'s `SEED_ADMIN_PASSWORD` fallback at
whatever the live admin password actually is (or, better, make
`scripts/seed-admin.ts` and `scripts/set-admin-password.ts` agree on a
single default so this class of mismatch can't recur), then re-run
`npm run test:security` and read the real result. Estimate: under 15
minutes of engineering time, most of it re-running the suite.

**Everything else that would gate GO is otherwise in reasonable shape:**
build/typecheck/CSS/DB/secret-hygiene all pass; malicious-upload hardening
is 14/14; the DB itself shows zero orphan FKs, `phone_e164` correctly typed
as text, consent captured on every row, connections at 1.7%. This is not a
system in bad shape — it's a system where one specific, high-value check
needs to actually run before anyone can respons­ibly say GO.

## What's next

F1 is the blocker for re-running gates 3/4/5 at all, so it goes first. F2/F3/F6
are independent P1s, fixed and verified individually. F4 is mechanical
(needed to get gate 0 green) but touches security-relevant code
(`candidate-password.ts`), so it gets read carefully, not just type-asserted
into silence. F5 is a one-line rename. F7 is explicitly not being touched.

Proceeding to fix in this order: F1 → F2 → F3 → F6 → F4 → F5, each its own
commit, each re-verified on the real route before moving on.
