"use client";

import { useCallback, useMemo, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { resolveDatePreset, type DatePresetId, type ResolvedRange } from "@/lib/date/ist";

export type ConsoleFilters = {
  q: string;
  stage: string;
  jobId: string;
  driveId: string;
  preset: DatePresetId;
  from: string | null;
  to: string | null;
  page: number;
  view: "table" | "kanban";
};

const DEFAULTS: ConsoleFilters = {
  q: "",
  stage: "",
  jobId: "",
  driveId: "",
  preset: "last30",
  from: null,
  to: null,
  page: 1,
  view: "table",
};

const RESETS_PAGE = new Set(["q", "stage", "jobId", "driveId", "preset", "from", "to"]);

export function useFilterState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // R3 — stable primitive, NOT the searchParams object.
  const key = searchParams.toString();

  const filters: ConsoleFilters = useMemo(() => {
    const p = new URLSearchParams(key);
    return {
      q: p.get("q") ?? DEFAULTS.q,
      stage: p.get("stage") ?? DEFAULTS.stage,
      jobId: p.get("jobId") ?? DEFAULTS.jobId,
      driveId: p.get("driveId") ?? DEFAULTS.driveId,
      preset: (p.get("preset") ?? DEFAULTS.preset) as DatePresetId,
      from: p.get("from"),
      to: p.get("to"),
      page: Math.max(1, Number(p.get("page") ?? 1) || 1),
      view: p.get("view") === "kanban" ? "kanban" : "table",
    };
  }, [key]);

  // Depend on PRIMITIVES. resolveDatePreset() returns a fresh object each call;
  // a fresh object in a dependency array is its own loop.
  const range: ResolvedRange = useMemo(
    () => resolveDatePreset(filters.preset, filters.from || undefined, filters.to || undefined),
    [filters.preset, filters.from, filters.to]
  );

  // R2 — the ONLY writer. Called from onClick/onChange. Never from useEffect.
  const setFilters = useCallback(
    (patch: Partial<ConsoleFilters>) => {
      const next = new URLSearchParams(key);
      let touchedFilter = false;

      for (const [k, v] of Object.entries(patch)) {
        if (RESETS_PAGE.has(k)) touchedFilter = true;
        const isDefault = v === (DEFAULTS as any)[k];
        if (v === null || v === undefined || v === "" || isDefault) next.delete(k);
        else next.set(k, String(v));
      }
      if (touchedFilter && !("page" in patch)) next.delete("page");

      const qs = next.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      const currentUrl = key ? `${pathname}?${key}` : pathname;

      // NO-OP GUARD: if nothing changed, do not touch history at all.
      // This alone converts a mis-wired child from a browser-hanging storm
      // into a silent no-op. Keep it permanently.
      if (url === currentUrl) return;

      router.replace(url, { scroll: false });
    },
    [key, pathname, router]
  );

  const clearAll = useCallback(
    () => router.replace(pathname, { scroll: false }),
    [pathname, router]
  );

  return { filters, range, setFilters, clearAll, key };
}

/**
 * Search inputs: one history write per keystroke trips Chrome's throttle in
 * ~2 seconds of typing. Local state here is CORRECT — typing is ephemeral UI
 * state, not application state. Commit to the URL after a pause.
 */
export function useDebouncedParam(onCommit: (v: string) => void, delay = 300) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;

  const onChange = useCallback((next: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => commitRef.current(next), delay);
  }, [delay]);

  const flush = useCallback((next: string) => {
    if (timer.current) clearTimeout(timer.current);
    commitRef.current(next);
  }, []);

  return { onChange, flush };
}

/** Dev-only. Mount once in the console layout. Names the looping component. */
export function installHistoryLoopGuard(limit = 10) {
  if (typeof window === "undefined") return;
  if (process.env.NODE_ENV === "production") return;
  if ((window as any).__historyGuardInstalled) return;
  (window as any).__historyGuardInstalled = true;

  let count = 0, windowStart = Date.now();
  (window as any).__replaceStateCount = 0;
  const original = history.replaceState.bind(history);

  history.replaceState = function (...args: any[]) {
    (window as any).__replaceStateCount++;
    const now = Date.now();
    if (now - windowStart > 1000) { count = 0; windowStart = now; }
    if (++count === limit) {
      console.error(`[loop-guard] replaceState ${limit}x in <1s. A component is writing the URL from an effect.`);
      console.trace();
    }
    return (original as any)(...args);
  };
}
