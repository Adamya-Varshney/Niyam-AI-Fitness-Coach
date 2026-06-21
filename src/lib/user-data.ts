import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { BaselinePlan, ChatMessage, ChatTurnRole, PlanChange, UiAction } from "./types";

export interface CloudUserData {
  baselinePlan: BaselinePlan | null;
  chatHistory: ChatMessage[];
  loading: boolean;
}

interface ChatRow {
  id: string;
  role: string;
  text: string;
  why: string | null;
  plan_changes: unknown;
  ui_actions: unknown;
  kind: string | null;
  created_at: string;
}

export function useCloudUserData(userId: string | null): CloudUserData {
  const [baselinePlan, setBaselinePlan] = useState<BaselinePlan | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    Promise.all([
      supabase.from("profiles").select("baseline_plan").eq("id", userId).maybeSingle(),
      supabase
        .from("chat_messages")
        .select("id, role, text, why, plan_changes, ui_actions, kind, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(100),
    ])
      .then(([profileRes, msgsRes]) => {
        if (cancelled) return;
        const bp = (profileRes.data as unknown as { baseline_plan?: BaselinePlan } | null)?.baseline_plan ?? null;
        setBaselinePlan(bp ?? null);
        const rows = (msgsRes.data ?? []) as ChatRow[];
        setChatHistory(
          rows.map((r) => ({
            id: r.id,
            role: (r.role === "user" ? "user" : "agent") as ChatTurnRole,
            text: r.text,
            why: r.why ?? undefined,
            plan_changes: (r.plan_changes as PlanChange[] | null) ?? undefined,
            ui_actions: (r.ui_actions as UiAction[] | null) ?? undefined,
            kind: r.kind ?? undefined,
          })),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { baselinePlan, chatHistory, loading };
}

export async function persistChatMessage(
  userId: string,
  msg: {
    role: ChatTurnRole;
    text: string;
    why?: string;
    plan_changes?: PlanChange[];
    ui_actions?: UiAction[];
    kind?: string;
  },
): Promise<void> {
  try {
    await supabase.from("chat_messages").insert({
      user_id: userId,
      role: msg.role,
      text: msg.text,
      why: msg.why ?? null,
      plan_changes: (msg.plan_changes ?? null) as unknown as never,
      ui_actions: (msg.ui_actions ?? null) as unknown as never,
      kind: msg.kind ?? null,
    });
  } catch {
    /* non-blocking */
  }
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
