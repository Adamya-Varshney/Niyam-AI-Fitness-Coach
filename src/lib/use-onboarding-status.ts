import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/user-context";

type Status = "loading" | "pending" | "complete";

export function useOnboardingStatus(): Status {
  const { userId } = useUser();
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (!userId) {
      setStatus("loading");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    supabase
      .from("profiles")
      .select("onboarded_at")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setStatus(data?.onboarded_at ? "complete" : "pending");
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return status;
}
