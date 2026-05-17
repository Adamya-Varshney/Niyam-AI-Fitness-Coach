import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/user-context";

type Status = "loading" | "pending" | "complete";

const flagKey = (uid: string) => `fc_onboarded:${uid}`;

export function markOnboardedLocally(userId: string) {
  try {
    localStorage.setItem(flagKey(userId), "1");
  } catch {
    /* ignore */
  }
}

function readLocalFlag(userId: string): boolean {
  try {
    return localStorage.getItem(flagKey(userId)) === "1";
  } catch {
    return false;
  }
}

export function useOnboardingStatus(): Status {
  const { userId } = useUser();
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (!userId) {
      setStatus("loading");
      return;
    }
    let cancelled = false;

    // Optimistic: if we already finished onboarding in this browser, treat as complete.
    if (readLocalFlag(userId)) {
      setStatus("complete");
    } else {
      setStatus("loading");
    }

    const fetchStatus = () => {
      supabase
        .from("profiles")
        .select("onboarded_at")
        .eq("id", userId)
        .maybeSingle()
        .then(({ data }) => {
          if (cancelled) return;
          if (data?.onboarded_at) {
            markOnboardedLocally(userId);
            setStatus("complete");
          } else if (!readLocalFlag(userId)) {
            setStatus("pending");
          }
        });
    };

    fetchStatus();

    const onFocus = () => fetchStatus();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, [userId]);

  return status;
}
