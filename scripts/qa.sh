#!/usr/bin/env bash
#
# scripts/qa.sh
#
# Part 16 §16.2 — seven gates, run in order, none of them stop the others.
# Knowing you have four problems is more useful than finding one and
# stopping. Every gate's full output lands in reports/qa-<timestamp>/.
#
# Usage:
#   ./scripts/qa.sh                                          # local (npm start)
#   ./scripts/qa.sh https://akshara-careers.vercel.app       # deployed
#
# Never pass a DB connection string here. Scripts read NEON_DATABASE_URL
# from .env.local themselves (§16.0).

set -u  # no `set -e` — we want every gate to run even if earlier ones fail

TARGET_URL="${1:-http://localhost:3000}"
IS_REMOTE=0
if [ "$#" -ge 1 ]; then
  IS_REMOTE=1
fi

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
REPORT_DIR="reports/qa-${TIMESTAMP}"
mkdir -p "$REPORT_DIR"

echo "Akshara Careers — QA suite"
echo "Target: ${TARGET_URL}"
echo "Report: ${REPORT_DIR}"
echo "==============================================="

declare -a GATE_NAMES=()
declare -a GATE_STATUS=()

run_gate() {
  local name="$1"
  local logfile="$2"
  shift 2
  echo ""
  echo "── Gate: ${name} ──────────────────────────────"
  if "$@" > "$logfile" 2>&1; then
    echo "PASS  ${name}"
    GATE_NAMES+=("$name")
    GATE_STATUS+=("PASS")
  else
    echo "FAIL  ${name}  (see ${logfile})"
    tail -n 20 "$logfile" | sed 's/^/    /'
    GATE_NAMES+=("$name")
    GATE_STATUS+=("FAIL")
  fi
}

SERVER_PID=""
cleanup() {
  if [ -n "$SERVER_PID" ]; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

# ─── Gate 0 — Build ──────────────────────────────────────────────────────────
run_gate "0-build-typecheck" "${REPORT_DIR}/00-typecheck.log" npm run typecheck
run_gate "0-build-lint" "${REPORT_DIR}/00-lint.log" npm run lint
run_gate "0-build-unit" "${REPORT_DIR}/00-unit.log" npm run test:unit

if [ "$IS_REMOTE" -eq 0 ]; then
  run_gate "0-build-production" "${REPORT_DIR}/00-build.log" npm run build
else
  echo ""
  echo "── Gate: 0-build-production ────────────────────"
  echo "SKIP  running against a deployed URL — build already happened at deploy time."
  GATE_NAMES+=("0-build-production")
  GATE_STATUS+=("SKIP")
fi

# ─── Gate 1 — CSS emitted (Document 4 §15.1) ────────────────────────────────
echo ""
echo "── Gate: 1-css-emitted ─────────────────────────"
if [ "$IS_REMOTE" -eq 0 ]; then
  # Next.js 16 + Turbopack emits CSS under .next/static/chunks/*.css, not the
  # classic webpack .next/static/css/ path — search recursively and exclude
  # .next/dev (dev-server cache, not the production build we care about).
  CSS_BYTES=$(find .next/static -iname '*.css' -not -path '*/dev/*' -exec cat {} + 2>/dev/null | wc -c | tr -d ' ')
  CSS_BYTES="${CSS_BYTES:-0}"
  echo "CSS emitted: ${CSS_BYTES} bytes" | tee "${REPORT_DIR}/01-css-bytes.log"
  if [ "$CSS_BYTES" -ge 15360 ]; then
    echo "PASS  1-css-emitted"
    GATE_NAMES+=("1-css-emitted"); GATE_STATUS+=("PASS")
  else
    echo "FAIL  1-css-emitted — under the 15KB floor, Tailwind likely emitted zero real utilities"
    GATE_NAMES+=("1-css-emitted"); GATE_STATUS+=("FAIL")
  fi
else
  CSS_BYTES=$(curl -s "${TARGET_URL}/careers" \
    | grep -oE '/_next/static/css/[a-zA-Z0-9._-]+\.css' \
    | sort -u \
    | while read -r path; do curl -s "${TARGET_URL}${path}"; done \
    | wc -c | tr -d ' ')
  CSS_BYTES="${CSS_BYTES:-0}"
  echo "CSS emitted (fetched from deployed page): ${CSS_BYTES} bytes" | tee "${REPORT_DIR}/01-css-bytes.log"
  if [ "$CSS_BYTES" -ge 15360 ]; then
    echo "PASS  1-css-emitted"
    GATE_NAMES+=("1-css-emitted"); GATE_STATUS+=("PASS")
  else
    echo "FAIL  1-css-emitted"
    GATE_NAMES+=("1-css-emitted"); GATE_STATUS+=("FAIL")
  fi
fi

# ─── Gate 2 — Database (read-only, safe against production) ────────────────
run_gate "2-database" "${REPORT_DIR}/db-audit.log" npx tsx scripts/db-audit.ts --explain

# ─── Start a local production server for gates 3–5 if testing locally ──────
if [ "$IS_REMOTE" -eq 0 ]; then
  echo ""
  echo "Starting production server for design/functional/perf gates..."
  npm start > "${REPORT_DIR}/server.log" 2>&1 &
  SERVER_PID=$!
  for i in $(seq 1 30); do
    if curl -sf "${TARGET_URL}" >/dev/null 2>&1; then break; fi
    sleep 1
  done
fi

export PLAYWRIGHT_BASE_URL="$TARGET_URL"
export TEST_BASE_URL="$TARGET_URL"

# ─── Gate 3 — Design integrity ───────────────────────────────────────────────
run_gate "3-design-integrity" "${REPORT_DIR}/03-design-integrity.log" \
  npx playwright test tests/e2e/design-integrity.spec.ts --reporter=list

# ─── Gate 4 — Functional (everything else in tests/e2e, minus design/perf) ──
run_gate "4-functional" "${REPORT_DIR}/04-functional.log" \
  npx playwright test tests/e2e --grep-invert "Design Integrity" --reporter=list

# ─── Gate 5 — Performance ────────────────────────────────────────────────────
if [ "$IS_REMOTE" -eq 1 ]; then
  export LHCI_TARGET_URL="$TARGET_URL"
fi
run_gate "5-performance" "${REPORT_DIR}/05-lighthouse.log" npx lhci autorun --config=lighthouserc.js
cp -r reports/lighthouse "${REPORT_DIR}/lighthouse" 2>/dev/null || true

# ─── Gate 6 — Secret hygiene ─────────────────────────────────────────────────
echo ""
echo "── Gate: 6-secret-hygiene ──────────────────────"
SEEDED_PASSWORD="${SEED_ADMIN_PASSWORD:-Admin@123}"
LEAK_HITS=$(grep -rn --exclude-dir=node_modules --exclude-dir=.git --exclude-dir="$REPORT_DIR" \
  --exclude="*.env*" --exclude-dir=reports \
  -- "$SEEDED_PASSWORD" . 2>/dev/null \
  | grep -v "scripts/seed-admin.ts" \
  | grep -v "scripts/qa.sh")
echo "$LEAK_HITS" > "${REPORT_DIR}/06-secret-hygiene.log"
if [ -z "$LEAK_HITS" ]; then
  echo "PASS  6-secret-hygiene — seeded password appears nowhere outside .env*/seed-admin.ts"
  GATE_NAMES+=("6-secret-hygiene"); GATE_STATUS+=("PASS")
else
  echo "FAIL  6-secret-hygiene — seeded password literal found outside its expected homes:"
  echo "$LEAK_HITS" | sed 's/^/    /'
  GATE_NAMES+=("6-secret-hygiene"); GATE_STATUS+=("FAIL")
fi

# ─── Summary ──────────────────────────────────────────────────────────────
echo ""
echo "==============================================="
echo "QA SUMMARY — ${REPORT_DIR}"
echo "==============================================="
FAILED=0
for i in "${!GATE_NAMES[@]}"; do
  printf '%-28s %s\n' "${GATE_NAMES[$i]}" "${GATE_STATUS[$i]}"
  if [ "${GATE_STATUS[$i]}" = "FAIL" ]; then FAILED=1; fi
done
echo "==============================================="

if [ "$FAILED" -eq 1 ]; then
  echo "RESULT: FAIL — see ${REPORT_DIR} for full logs per gate."
  exit 1
else
  echo "RESULT: PASS — all gates green."
  exit 0
fi
