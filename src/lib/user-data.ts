import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { BaselinePlan } from "./types";

export interface CloudUserData {
  baselinePlan: BaselinePlan | null;
  loading: boolean;
}

export function useCloudUserData(userId: string | null): CloudUserData {
  const [baselinePlan, setBaselinePlan] = useState<BaselinePlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    supabase
      .from("profiles")
      .select("baseline_plan")
      .eq("id", userId)
      .maybeSingle()
      .then((res) => {
        if (cancelled) return;
        const bp = (res.data as { baseline_plan?: BaselinePlan } | null)?.baseline_plan ?? null;
        setBaselinePlan(bp ?? null);
      })
      .then(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { baselinePlan, loading };
}

export async function backfillBaselinePlan(
  userId: string,
  plan: BaselinePlan,
): Promise<void> {
  try {
    await supabase
      .from("profiles")
      .update({ baseline_plan: plan as unknown as never })
      .eq("id", userId);
  } catch {
    /* non-blocking */
  }
}
