# SUMMARY — Akshara Careers verification campaign

**Baseline:** `e97f3e298f51a4098c6527146809bdacf337816e` (checkpoint commit of
prior uncommitted work).
**Final commit this session:** see `git log` on `master` — 15 fix/evidence
commits since baseline, one root cause per commit (two exceptions noted in
their own commit messages where the harness didn't support hunk-level
staging).
**Scope reduction from Document 8 Part 19 (recorded, not silent):**
`neonctl`, `vercel`, and `k6` are not installed in this environment. No
Neon QA branch was created, no Vercel preview was deployed, no k6
load-spike stage ran. Everything else ran against localhost / the existing
database (`db-audit` is read-only).

## Gate results — final state

| Gate | Baseline | Final | Notes |
|---|---|---|---|
| 0-build-typecheck | FAIL | **PASS** | F1, F4, F9 |
| 0-build-lint | FAIL | **PASS** | F7 — full remediation, 205 → 0 problems |
| 0-build-unit | PASS | PASS | 54/54 throughout |
| 0-build-production | FAIL | **PASS** | F1 (root cause) + F4/F9 (also required) |
| 1-css-emitted | PASS | PASS | ~89KB, floor 15KB |
| 2-database | PASS | PASS | 129 PASS / 0 FAIL / 5 WARN |
| 3-design-integrity | FAIL (never ran) | **PASS** | 126/126, all 6 browsers, F10/F11 fixed |
| 4-functional | FAIL (never ran) | **PASS*** | 216/222 outright; 6 WebKit-family engine-launch flakes (F13), not app defects |
| 5-performance | FAIL (never ran) | **Not obtained** | Windows `chrome-launcher` `EPERM` — tooling limitation, not a bad score |
| 6-secret-hygiene | FAIL | **PASS** | F6 |
| security: upload-hardening | not run at baseline | **14/14 PASS** | |
| security: authz-matrix | not run at baseline | **50/50 PASS** | F14 (fixed twice — see below), F15 |

## What changed

15 commits: F1, F2, F3, F4, F9, F6+F5 (round 1) · F14+F15, F12, F10, F11, F8
(round 2) · F7 parts 1-3 (round 3, lint remediation) · F14 correction
(round 4, found during final re-verification). Every fix independently
verified with pasted command output — see `FIXES.md`. `TRIAGE.md` has
every finding (F1-F15), root cause, severity, and resolution.
`AMENDMENTS.md` confirms no assertion was loosened.

## The one finding that took two attempts

**F14** (P0 IDOR verification blocked by an admin-login credential
mismatch) was "fixed" once, confirmed 50/50 passing, and then broke again
hours later with zero intervening changes to security-relevant code — a
fourth admin-bootstrap script (`lib/db/seed.ts`) had the same stale
default the first fix missed, and a test file (`console-auth.spec.ts`)
was silently reverting the fix as a side effect of testing an unrelated
feature (forced password rotation) every time the functional suite ran.
Caught only because the campaign's own re-verification step re-ran the
full suite instead of trusting the earlier "passing" result. Full account
in `TRIAGE.md` F14 — this is the clearest illustration in this campaign of
why `verification-before-completion` matters: a green run that hasn't been
re-earned isn't evidence.

## Launch decision

**GO.** See `TRIAGE.md` for full reasoning, evidence, and what GO does
and doesn't claim (WebKit-family browsers and Lighthouse performance
numbers are the two honest gaps — see there for why neither blocks the
decision).
