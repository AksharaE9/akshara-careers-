# Ground Truth Diagnosis — Operations Pulse & Analytics Pipeline

**Date**: 2026-08-12  
**Target Screen**: `/console` (Pulse Dashboard) & Console Analytics surfaces  
**Status**: TASK 1 Diagnosis Complete — Gate 1 Reached  

---

## 1.1 Existential DB Data Status
The following tables are present in the Neon database. The actual count and earliest record timestamps:

| Table | Record Count (`n`) | Earliest Record Time (`earliest`) | Real Data Present? |
|---|---|---|---|
| `applications` | **1** | 2026-08-12 05:46:20.205 UTC | **YES** |
| `candidates` | **1** | 2026-08-12 05:45:48.066 UTC | **YES** |
| `campus_drives` | **5** | 2026-08-10 05:04:31.588 UTC | **YES** |
| `analytics_events` | **0** | *NULL* | **NO** (unwired) |
| `analytics_daily` | **0** | *NULL* | **NO** (no rollups run) |
| `funnel_daily` | **0** | *NULL* | **NO** (no rollups run) |
| `web_vitals` | **0** | *NULL* | **NO** (unwired) |

*Verdict*: The entire tracking pipeline is unwired. Any metric/sparkline depending on visitors, views, funnel, or web vitals is currently simulated.

---

## 1.2 Analytics Pipeline Ingestion Test
- **Ingestion Test Result**: A POST request to `/api/track` returns `204 No Content` but does not write database rows unless client-side tracking calls exist.
- **Verification Query**:
  ```sql
  SELECT name, count(*), max(ts) FROM analytics_events
  WHERE ts > now() - interval '10 minutes' GROUP BY 1 ORDER BY 2 DESC;
  ```
- **Result**: `0 rows returned`.
- **Reason**: The tracking SDK `lib/analytics/track.ts` is never imported or called anywhere in the public careers board (`app/careers/page.tsx`, `components/careers`, etc.).

---

## 1.3 Fabricated Value Inventory (Scan Results)
Our mock data detector script (`scripts/detect-mock-data.sh`) highlights the following:
1. **Pulse KPI Deltas & Sparklines**: `app/console/page.tsx` line 84-89 hardcodes `delta` values (`+14.2%`, `+3.1%`, `+18.5%`, etc.) and sparkline number arrays.
2. **Channel Breakdown**: `app/console/page.tsx` line 334-357 hardcodes fixed channel percentages (`58%`, `27%`, `15%`) and simulates the widths on elements.
3. **Traffic Insights**: `app/api/console/insight/traffic/route.ts` returns a fully static JSON object containing hardcoded mock numbers (visitors: 1480, sessions: 2190, pageViews: 5840, LCP p75: 1.42s).
4. **Funnel Data**: `app/api/console/funnel/route.ts` generates hardcoded conversion counts, drop-offs, and error metrics, scaling them only by connection speed multiplier.
5. **Jobs Analytics**: `app/api/console/insight/jobs/route.ts` queries real applications, but invents views/clicks/starts counts with math formulas based on real application counts (`views = Math.max(120, j.applicationsCount * 45 + 180)`).

---

## 1.4 End-to-End Metric Trace (Unique Visitors)
Tracing `Unique Visitors` from UI to DB query:
1. **JSX**: `app/console/page.tsx` renders `<PulseTile value={data.kpis.uniqueVisitors.value} />`.
2. **State**: Populated by fetching `/api/console/pulse`.
3. **Route**: `app/api/console/pulse/route.ts` calls `getPulseData()` in `lib/db/queries/pulse.ts`.
4. **Query**: `lib/db/queries/pulse.ts` defines:
   ```ts
   uniqueVisitors: {
     value: 1420 + totalApps * 12,
     delta: '+18.5%',
     sparkline: [80, 95, 110, 105, 120, 135, 130, 145, 160, 155, 170, 185, 190, 210],
   }
   ```
5. **Conclusion**: The metric is fully synthetic. No DB query for real visitors exists.

---

## 1.5 Freshness / Timer Verification
- **Network Check**: `/api/console/pulse` requests fire every 3000ms.
- **Timer Check**: The UI label `Last updated {secondsAgo}s ago` counts up independently via a `setInterval` ticker. If a query is stuck or offline, the label still resets when a poll resolves, but is not tied to the actual `dataUpdatedAt` timestamp from the server.
- **Verdict**: The timestamp is a client-side timer, not the true database or fetch completion timestamp.

---

## 🛑 GATE 1 SUMMARY

1. **Real Data Exists**:
   - `applications` (Stage Counts & Snapshot, Live Activity Feed, and Resume Success Rate computed dynamically)
   - `campus_drives` (Live/Upcoming drives query, view count metric)
   - Unverified colleges alias count alert.
2. **No Data (Requires TASK 5 Wiring)**:
   - Unique Visitors
   - Job Views
   - Conversion Funnel (Start → Submit)
   - Average completion duration
   - Core Web Vitals
   - Channel breakdown (since organic/referrals require referral tracking or analytics events).
