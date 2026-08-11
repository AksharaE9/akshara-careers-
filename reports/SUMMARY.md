# SUMMARY — Akshara Careers verification campaign

**Baseline:** `e97f3e298f51a4098c6527146809bdacf337816e` (checkpoint commit of
prior uncommitted work — see that commit message for provenance).
**Final commit this session:** `cf1bb46` and the fix commits before it.
**Scope reduction from Document 8 Part 19 (recorded, not silent):**
`neonctl`, `vercel`, and `k6` are not installed in this environment, and
`.env.local` has a single `NEON_DATABASE_URL` with no branch separation. No
Neon QA branch was created, no Vercel preview was deployed, and the k6
load-spike stage did not run. Everything else ran against localhost / the
existing database (`db-audit` is read-only).

## Gate results

| Gate | Baseline | After fixes | Notes |
|---|---|---|---|
| 0-build-typecheck | FAIL | **PASS** | F1, F4, F9 |
| 0-build-lint | FAIL | FAIL | F7 — pre-existing debt, out of scope (see AMENDMENTS.md) |
| 0-build-unit | PASS | PASS | |
| 0-build-production | FAIL | **PASS** | F1 (root cause) + F4/F9 (also required — Next type-checks the whole project) |
| 1-css-emitted | PASS | PASS | 88,844 bytes, floor 15,360 |
| 2-database | PASS | PASS | 129 PASS / 0 FAIL / 5 WARN, read-only, safe against whatever `NEON_DATABASE_URL` points to |
| 3-design-integrity | FAIL (never ran) | FAIL | Ran for the first time this session (F1 unblocked its webServer). F10, F11 confirmed real on plain Chromium; F13 is Firefox-launch environment noise |
| 4-functional | FAIL (never ran) | FAIL | Same unblocking. F12 confirmed real on plain Chromium; rest largely F13-class or unconfirmed |
| 5-performance | FAIL (never ran) | FAIL | Windows `chrome-launcher` `EPERM` on temp-dir cleanup — tooling failure, no score obtained, not an app regression |
| 6-secret-hygiene | FAIL | **PASS** | F6 |
| security: upload-hardening | not run at baseline | **14/14 PASS** | |
| security: authz-matrix | not run at baseline | 44/50 PASS | F14: 4 P0 IDOR checks + fixtures-guard test never reached their real assertion (test-fixture credential mismatch, left unresolved). F15: real 331ms login-timing-oracle finding |

## What changed

7 fix commits (F1, F2, F3, F4, F9, F6+F5), each independently verified and
re-verified in a full-suite re-run — see `FIXES.md` for diffs and pasted
verification output. `TRIAGE.md` has every finding (F1-F15), root cause, and
severity. `AMENDMENTS.md` confirms no assertion was loosened.

## Findings left open (explicit user decisions, not silent gaps)

- F8 — CSV export silently caps at 50 rows (P2)
- F10 — `[data-card-meta]` missing from job cards, universal (P1)
- F11 — 10 tap targets under 44×44px on mobile, universal (P1)
- F12 — candidate login lockout off-by-one, confirmed real (P1)
- F14 — 4 P0 IDOR checks unverified, not passing (test-fixture gap)
- F15 — 331ms login-timing oracle, confirmed real (P1)
- F7 — pre-existing lint debt, ~40 files (P2, backlog)

## Launch decision

**NO GO.** See `TRIAGE.md` for full detail; reasoning below.
