import { useEffect, useMemo, useRef, useState } from "react";

import { ApiError, newId, postChat, postNudgeAck } from "@/lib/api";
import { useStatePolling } from "@/lib/polling";
import { useUser } from "@/lib/user-context";
import type { BaselinePlan, ChatMessage, MessageType, Nudge, RecentTurn, SessionPlan } from "@/lib/types";

interface OnboardSeed {
  name?: string;
  welcome_message?: string;
  baseline_plan?: BaselinePlan;
  ts?: number;
}

function readOnboardSeed(): OnboardSeed | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("fc_onboard_seed");
    if (!raw) return null;
    return JSON.parse(raw) as OnboardSeed;
  } catch {
    return null;
  }
}

function extractRecentTurns(state: unknown): RecentTurn[] {
  const s = state as { recent_turns?: RecentTurn[]; profile?: { recent_turns_json?: string } } | null | undefined;
  if (Array.isArray(s?.recent_turns) && s!.recent_turns!.length > 0) return s!.recent_turns!;
  const raw = s?.profile?.recent_turns_json;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RecentTurn[]) : [];
  } catch {
    return [];
  }
}

function deriveTodaySession(state: unknown, fallback?: SessionPlan): SessionPlan | undefined {
  const s = state as
    | { today_session?: SessionPlan; current_plan?: { plan_json?: string | BaselinePlan; sessions?: SessionPlan[] } }
    | null
    | undefined;
  if (s?.today_session) return s.today_session;
  const cp = s?.current_plan;
  let sessions: SessionPlan[] | undefined;
  if (cp) {
    if (Array.isArray((cp as BaselinePlan).sessions)) {
      sessions = (cp as BaselinePlan).sessions;
    } else if (typeof cp.plan_json === "string") {
      try {
        const parsed = JSON.parse(cp.plan_json) as BaselinePlan;
        sessions = parsed?.sessions;
      } catch {
        /* ignore */
      }
    } else if (cp.plan_json && typeof cp.plan_json === "object") {
      sessions = (cp.plan_json as BaselinePlan).sessions;
    }
  }
  if (sessions && sessions.length > 0) {
    const today = new Date().toLocaleDateString("en-US", { weekday: "short" });
    return sessions.find((x) => x.day === today) ?? sessions.find((x) => x.status === "today") ?? sessions[0];
  }
  return fallback;
}
import { TodayCard } from "@/components/TodayCard";
import { ChatBubble } from "@/components/ChatBubble";
import { TypingIndicator } from "@/components/TypingIndicator";
import { Composer, type ComposerHandle } from "@/components/Composer";
import { BackendPlaceholder } from "@/components/BackendPlaceholder";

const COMPOSER_DISABLE_MS = 3000;

export default function Chat() {
  const { userId } = useUser();
  const polling = useStatePolling(userId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [welcomeBackVisible, setWelcomeBackVisible] = useState(true);
  const [lastWelcomeBack, setLastWelcomeBack] = useState<string | null>(null);
  const composerRef = useRef<ComposerHandle>(null);
  const seenNudges = useRef<Set<string>>(new Set());
  const hydratedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Seed greeting immediately on mount — don't wait on slow /state webhook.
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const seed = readOnboardSeed();
    const greeting =
      seed?.welcome_message?.trim() ||
      (seed?.name
        ? `Hi ${seed.name} — your week is ready. Tell me how today's going.`
        : "Hi — I'm here. Tell me how today's going.");
    setMessages([{ id: "welcome", role: "agent", text: greeting }]);
  }, []);

  // When real history arrives from polling, merge it in (replacing seeded greeting).
  const turnsMergedRef = useRef(false);
  useEffect(() => {
    if (turnsMergedRef.current) return;
    if (!polling.firstAttemptDone) return;
    const turns = extractRecentTurns(polling.state);
    if (turns.length === 0) {
      turnsMergedRef.current = true;
      return;
    }
    turnsMergedRef.current = true;
    setMessages(
      turns.map((t, i) => ({
        id: `t_${i}_${t.created_at ?? i}`,
        role: t.role,
        text: t.text,
        why: t.why,
        plan_changes: t.plan_changes,
        ui_actions: t.ui_actions,
        kind: t.kind,
      })),
    );
  }, [polling.firstAttemptDone, polling.state]);

  // Inject pending nudges as ambient bubbles.
  useEffect(() => {
    const nudges: Nudge[] = polling.state?.pending_nudges ?? [];
    if (nudges.length === 0) return;
    const fresh = nudges.filter((n) => !seenNudges.current.has(n.id));
    if (fresh.length === 0) return;
    fresh.forEach((n) => seenNudges.current.add(n.id));
    setMessages((prev) => [
      ...fresh.map<ChatMessage>((n) => ({
        id: n.id,
        role: "agent",
        text: n.text,
        kind: "nudge",
      })),
      ...prev,
    ]);
    if (userId) {
      fresh.forEach((n) => {
        void postNudgeAck(userId, n.id).catch(() => {
          /* silent */
        });
      });
    }
  }, [polling.state, userId]);

  // Welcome-back banner — show once per new message text.
  useEffect(() => {
    const wb = polling.state?.welcome_back_message ?? null;
    if (wb && wb !== lastWelcomeBack) {
      setLastWelcomeBack(wb);
      setWelcomeBackVisible(true);
    }
  }, [polling.state, lastWelcomeBack]);

  // Scroll to bottom when messages change.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, pending]);

  const send = async (text: string, type: MessageType = "text") => {
    if (!userId) return;
    const userMsgId = newId();
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", text },
    ]);
    setPending(true);

    try {
      const res = await postChat({
        user_id: userId,
        session_id: userId,
        message: text,
        message_type: type,
        message_id: newId(),
      });
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: "agent",
          text: res.reply,
          why: res.why,
          plan_changes: res.plan_changes,
          ui_actions: res.ui_actions,
        },
      ]);
      void polling.refresh();
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      if (apiErr?.status === 404) {
        setMessages((prev) => [
          ...prev,
          {
            id: newId(),
            role: "agent",
            text:
              "Your coach is still warming up — chat will be live shortly. For now, your plan is on the dashboard.",
          },
        ]);
        // Briefly disable composer
        setPending(true);
        window.setTimeout(() => setPending(false), COMPOSER_DISABLE_MS);
        return;
      }
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: "agent",
          text: "Hmm, I didn't catch that. Try again in a moment?",
          failed: true,
          retryPayload: { message: text, message_type: type },
        },
      ]);
    } finally {
      setPending(false);
    }
  };

  const onChip = (text: string) => {
    if (text === "Talk it through") {
      composerRef.current?.focus();
      return;
    }
    void send(text);
  };

  const onRetry = (m: ChatMessage) => {
    if (!m.retryPayload) return;
    // Remove the failed bubble
    setMessages((prev) => prev.filter((x) => x.id !== m.id));
    void send(m.retryPayload.message, m.retryPayload.message_type);
  };

  const seedSession = useMemo<SessionPlan | undefined>(() => {
    const seed = readOnboardSeed();
    const sessions = seed?.baseline_plan?.sessions ?? [];
    if (sessions.length === 0) return undefined;
    const today = sessions.find((s) => s.status === "today");
    return today ?? sessions[0];
  }, []);
  const todaySession = deriveTodaySession(polling.state, seedSession);
  const lastWhy = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === "agent" && m.why) return m.why;
    }
    return undefined;
  }, [messages]);

  return (
    <main className="flex flex-col h-[calc(100vh-3rem)] bg-background">
      <header className="border-b border-border/60 bg-background/95 backdrop-blur px-3 py-3">
        <div className="mx-auto max-w-2xl">
          {todaySession ? (
            <TodayCard
              session={todaySession}
              why={lastWhy}
              welcomeBack={welcomeBackVisible ? lastWelcomeBack : null}
              onDismissWelcome={() => setWelcomeBackVisible(false)}
            />
          ) : polling.firstAttemptDone && polling.neverLoaded ? (
            <BackendPlaceholder
              title="Your week"
              message="Live updates coming soon — your onboarding plan is saved and will appear here when the system is fully online."
            />
          ) : (
            <div className="h-16" />
          )}
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mx-auto max-w-2xl flex flex-col gap-4">
          {messages.map((m) => (
            <ChatBubble key={m.id} message={m} onChip={onChip} onRetry={onRetry} />
          ))}
          {pending && (
            <div className="flex justify-start fade-in">
              <TypingIndicator />
            </div>
          )}
        </div>
      </div>

      <Composer
        ref={composerRef}
        onSend={(t) => void send(t, "text")}
        onVoice={(b64) => void send(b64, "voice")}
      />
    </main>
  );
}
