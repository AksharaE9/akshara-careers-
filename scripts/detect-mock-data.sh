#!/usr/bin/env bash
#
# scripts/detect-mock-data.sh
#
# Scans console components for inline mock data patterns (Task 1.3).
#

echo "Running heuristic scans for mock data..."

# Pass 1: Mock identifiers / names
echo "Pass 1: Mock Identifiers / Names"
grep -rnE 'APP-ORG-|GFGC-YLK-|Aditi Sharma|Rahul Nair' app/ components/ 2>/dev/null

# Pass 2: Hardcoded deltas
echo "Pass 2: Hardcoded Deltas"
grep -rnE '\+14\.2%|\+3\.1%|\+18\.5%|\+9\.4%|-18s faster|\+0\.4%' app/ components/ 2>/dev/null

# Pass 3: Fixed percentage splits / charts
echo "Pass 3: Fixed Percentage Splits"
grep -rnE '58%|27%|15%|\[58, 27, 15\]|\[62, 65, 68|\[80, 95, 110|\[200, 220, 240|\[240, 235, 230' app/ components/ 2>/dev/null

# Pass 4: Large literals / hardcoded metrics
echo "Pass 4: Large Literals / Hardcoded Metrics"
grep -rnE '1432|3865|1480|3965' app/ components/ 2>/dev/null

# Pass 5: Inline chart arrays / sparklines
echo "Pass 5: Inline Chart Arrays"
grep -rnE 'sparkline: \[' app/ components/ 2>/dev/null

# Pass 6: Math.random() usage in components/routes
echo "Pass 6: Math.random() Usage"
grep -rnE 'Math\.random\(\)' app/ components/ 2>/dev/null

# Pass 7: Hardcoded drive codes / venues
echo "Pass 7: Hardcoded Drive Codes / Venues"
grep -rnE 'MSRIT-2026|GFGC-YLK-0726' app/ components/ 2>/dev/null

# Pass 8: Numeric || fallbacks
echo "Pass 8: Numeric || Fallbacks"
grep -rnE 'value || [0-9]+' app/ components/ 2>/dev/null

exit 0
