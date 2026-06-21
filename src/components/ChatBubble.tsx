import { useState, type ReactNode } from "react";
import { Volume2, RotateCw, Clock } from "lucide-react";
import type { ChatMessage } from "@/lib/types";

interface ChatBubbleProps {
  message: ChatMessage;
  onChip?: (text: string) => void;
  onRetry?: (m: ChatMessage) => void;
  /** First message in a same-role group (above is different role or none). */
  isFirstInGroup?: boolean;
  /** Last message in a same-role group (below is different role or none). */
  isLastInGroup?: boolean;
}

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const utter = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const preferred =
    voices.find((v) => v.name === "Samantha") ||
    voices.find((v) => v.name === "Google US English") ||
    voices.find((v) => v.lang?.startsWith("en"));
  if (preferred) utter.voice = preferred;
  utter.rate = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

/** Strip stray asterisks that wrap the entire message (e.g. "**Hello**" alone). */
function cleanText(raw: string): string {
  let t = raw.trim();
  // Repeated unwrap in case of "***text***"
  while (
    (t.startsWith("**") && t.endsWith("**") && t.length > 4) ||
    (t.startsWith("*") && t.endsWith("*") && !t.startsWith("**") && t.length > 2)
  ) {
    t = t.startsWith("**") ? t.slice(2, -2).trim() : t.slice(1, -1).trim();
  }
  return t;
}

/**
 * Tiny inline markdown renderer — handles **bold**, *italic*, _italic_,
 * `code`, and bare URLs. Preserves line breaks via CSS whitespace-pre-wrap.
 * Dependency-free; safe because we only ever emit text + a fixed set of tags.
 */
function renderInline(text: string): ReactNode[] {
  const cleaned = cleanText(text);
  // Order matters: code first (so its contents aren't re-parsed), then bold, then italic, then links.
  const pattern =
    /(`[^`]+`)|(\*\*[^*\n]+\*\*)|(\*[^*\n]+\*)|(_[^_\n]+_)|((?:https?:\/\/|www\.)[^\s]+)/g;

  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of cleaned.matchAll(pattern)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(cleaned.slice(last, idx));
    const tok = m[0];
    if (tok.startsWith("`")) {
      out.push(<code key={`c${i}`}>{tok.slice(1, -1)}</code>);
    } else if (tok.startsWith("**")) {
      out.push(<strong key={`b${i}`}>{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith("*")) {
      out.push(<em key={`i${i}`}>{tok.slice(1, -1)}</em>);
    } else if (tok.startsWith("_")) {
      out.push(<em key={`u${i}`}>{tok.slice(1, -1)}</em>);
    } else {
      const href = tok.startsWith("http") ? tok : `https://${tok}`;
      out.push(
        <a
          key={`l${i}`}
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          className="underline underline-offset-2 hover:opacity-80"
        >
          {tok}
        </a>,
      );
    }
    last = idx + tok.length;
    i++;
  }
  if (last < cleaned.length) out.push(cleaned.slice(last));
  return out;
}

function formatTime(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function CoachAvatar() {
  return (
    <div
      className="h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-[11px] font-medium text-white shadow-sm"
      style={{
        background:
          "linear-gradient(135deg, hsl(43 96% 56%) 0%, hsl(15 90% 60%) 100%)",
      }}
      aria-hidden="true"
    >
      N
    </div>
  );
}

export function ChatBubble({
  message,
  onChip,
  onRetry,
  isFirstInGroup = true,
  isLastInGroup = true,
}: ChatBubbleProps) {
  const [showWhy, setShowWhy] = useState(false);
  const [showChanges, setShowChanges] = useState(false);

  const isUser = message.role === "user";
  const isWeeklyReview = message.kind === "weekly_review";
  const isNudge = message.kind === "nudge";
  const stamp = isLastInGroup ? formatTime(message.created_at) : null;

  // Tighten vertical gap within a group.
  const groupSpacing = isFirstInGroup ? "" : "-mt-1.5";

  if (isUser) {
    const shape = isLastInGroup ? "bubble-user bubble-user-tail" : "bubble-user-mid bg-user-bubble text-user-bubble-foreground";
    return (
      <div className={`flex justify-end fade-in ${groupSpacing}`}>
        <div className="flex flex-col items-end max-w-[75%]">
          <div
            className={`relative ${shape} px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words`}
          >
            {renderInline(message.text)}
          </div>
          {stamp && (
            <span className="mt-1 text-[10px] text-muted-foreground pr-1">{stamp}</span>
          )}
        </div>
      </div>
    );
  }

  const showOptions = (message.ui_actions ?? []).find((a) => a.type === "show_options");
  const shape = isLastInGroup
    ? "bubble-agent bubble-agent-tail"
    : "bubble-agent-mid bg-agent-bubble text-agent-bubble-foreground";

  return (
    <div className={`flex flex-col gap-1.5 fade-in ${groupSpacing}`}>
      {isWeeklyReview && <div className="border-t border-border/60 pt-2" />}
      <div className="flex justify-start items-end gap-2">
        <div className="w-7 shrink-0">{isFirstInGroup && <CoachAvatar />}</div>
        <div className="flex flex-col items-start max-w-[80%]">
          <div
            className={`relative ${shape} px-3.5 py-2 leading-relaxed whitespace-pre-wrap break-words ${
              isWeeklyReview ? "text-lg" : "text-sm"
            }`}
          >
            {isNudge && (
              <Clock className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5 text-accent-warm" />
            )}
            {renderInline(message.text)}
          </div>
          {stamp && (
            <span className="mt-1 text-[10px] text-muted-foreground pl-1">{stamp}</span>
          )}
        </div>
      </div>

      {isLastInGroup && !message.pending && (
        <div className="flex items-center gap-3 pl-10 opacity-0 group-hover:opacity-100 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200 [.fade-in:hover_&]:opacity-100">
          <button
            type="button"
            onClick={() => speak(message.text)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Play"
          >
            <Volume2 className="h-3.5 w-3.5" />
          </button>
          {message.why && (
            <button
              type="button"
              onClick={() => setShowWhy((s) => !s)}
              className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
            >
              why?
            </button>
          )}
          {message.failed && onRetry && (
            <button
              type="button"
              onClick={() => onRetry(message)}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCw className="h-3 w-3" /> Try again
            </button>
          )}
        </div>
      )}

      {showWhy && message.why && (
        <p className="text-xs italic text-muted-foreground pl-10 leading-relaxed max-w-[80%]">
          {message.why}
        </p>
      )}

      {showOptions?.options && showOptions.options.length > 0 && (
        <div className="flex flex-wrap gap-2 pl-10">
          {showOptions.options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChip?.(opt)}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground hover:border-foreground/40 hover:bg-secondary transition-colors"
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {message.plan_changes && message.plan_changes.length > 0 && (
        <div className="pl-10">
          <button
            type="button"
            onClick={() => setShowChanges((s) => !s)}
            className="rounded-full bg-accent-cool/15 text-foreground px-3 py-1.5 text-xs hover:bg-accent-cool/25 transition-colors"
          >
            Your week was updated
          </button>
          {showChanges && (
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {message.plan_changes.map((c, i) => (
                <li key={i}>
                  <span className="text-foreground">{c.day}:</span> {c.old} → {c.new}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {isWeeklyReview && (
        <div className="flex flex-wrap gap-2 pl-10 mt-1">
          {["Looks good", "Tweak Thursday", "Talk it through"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChip?.(t)}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground hover:border-foreground/40 hover:bg-secondary transition-colors"
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
