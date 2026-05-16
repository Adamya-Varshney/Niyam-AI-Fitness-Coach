import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, newId, postChat, postNudgeAck } from "@/lib/api";
import { useStatePolling } from "@/lib/polling";
import { useUser } from "@/lib/user-context";
import type { ChatMessage, MessageType, Nudge } from "@/lib/types";
import { TodayCard } from "@/components/TodayCard";
import { ChatBubble } from "@/components/ChatBubble";
import { TypingIndicator } from "@/components/TypingIndicator";
import { Composer, type ComposerHandle } from "@/components/Composer";
import { BackendPlaceholder } from "@/components/BackendPlaceholder";
import { LayoutDashboard } from "lucide-react";

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

  // Hydrate thread from polling state once.
  useEffect(() => {
    if (hydratedRef.current) return;
    if (!polling.firstAttemptDone) return;
    hydratedRef.current = true;

    const turns = polling.state?.recent_turns ?? [];
    if (turns.length > 0) {
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
    } else {
      setMessages([
        {
          id: "welcome",
          role: "agent",
          text: "Hi — I'm here. Tell me how today's going.",
        },
      ]);
    }
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

  const todaySession = polling.state?.today_session;
  const lastWhy = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === "agent" && m.why) return m.why;
    }
    return undefined;
  }, [messages]);

  return (
    <main className="flex flex-col h-screen bg-background">
      <header className="border-b border-border/60 bg-background/95 backdrop-blur px-3 py-3">
        <div className="mx-auto max-w-2xl flex items-start gap-3">
          <div className="flex-1">
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
          <Link
            to="/dashboard"
            aria-label="Dashboard"
            className="mt-1 flex items-center justify-center h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <LayoutDashboard className="h-4 w-4" />
          </Link>
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
