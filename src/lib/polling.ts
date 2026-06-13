import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, getState } from "./api";
import type { StateResponse } from "./types";

interface UseStatePollingResult {
  state: StateResponse | null;
  isStale: boolean;
  /** True if we have never received a successful state response. */
  neverLoaded: boolean;
  /** True after the first attempt completes (success or failure). */
  firstAttemptDone: boolean;
  /** True if the first attempt failed with 404 (webhook not built). */
  notBuilt: boolean;
  refresh: () => Promise<void>;
}

const cacheKey = (userId: string) => `fc_state_cache:${userId}`;

function readCache(userId: string | null): StateResponse | null {
  if (!userId || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(cacheKey(userId));
    return raw ? (JSON.parse(raw) as StateResponse) : null;
  } catch {
    return null;
  }
}

function writeCache(userId: string, value: StateResponse) {
  try {
    window.localStorage.setItem(cacheKey(userId), JSON.stringify(value));
  } catch {
    /* ignore quota */
  }
}

export function useStatePolling(userId: string | null): UseStatePollingResult {
  const [state, setState] = useState<StateResponse | null>(() => readCache(userId));
  const [isStale, setIsStale] = useState(false);
  // If we hydrated from cache, treat first attempt as done so UI renders immediately.
  const [firstAttemptDone, setFirstAttemptDone] = useState(() => readCache(userId) !== null);
  const [notBuilt, setNotBuilt] = useState(false);

  const failureCount = useRef(0);
  const intervalRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const fetchOnce = useCallback(async () => {
    if (!userId) return;
    try {
      const next = await getState(userId);
      if (!mountedRef.current) return;
      setState(next);
      writeCache(userId, next);
      setIsStale(false);
      setNotBuilt(false);
      failureCount.current = 0;
    } catch (err) {
      if (!mountedRef.current) return;
      failureCount.current += 1;
      if (err instanceof ApiError && err.status === 404 && state === null) {
        setNotBuilt(true);
      }
      if (failureCount.current >= 2) setIsStale(true);
    } finally {
      if (mountedRef.current) setFirstAttemptDone(true);
    }
  }, [userId, state]);

  const startInterval = useCallback(() => {
    if (intervalRef.current != null) return;
    intervalRef.current = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchOnce();
      }
    }, 60_000);
  }, [fetchOnce]);

  const stopInterval = useCallback(() => {
    if (intervalRef.current != null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (!userId) return;

    void fetchOnce();
    if (document.visibilityState === "visible") startInterval();

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void fetchOnce();
        startInterval();
      } else {
        stopInterval();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      mountedRef.current = false;
      document.removeEventListener("visibilitychange", onVisibility);
      stopInterval();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const refresh = useCallback(async () => {
    await fetchOnce();
  }, [fetchOnce]);

  return {
    state,
    isStale,
    neverLoaded: state === null,
    firstAttemptDone,
    notBuilt,
    refresh,
  };
}
