import { useState } from "react";
import { Volume2, RotateCw, Clock } from "lucide-react";
import type { ChatMessage } from "@/lib/types";

interface ChatBubbleProps {
  message: ChatMessage;
  onChip?: (text: string) => void;
  onRetry?: (m: ChatMessage) => void;
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

export function ChatBubble({ message, onChip, onRetry }: ChatBubbleProps) {
  const [showWhy, setShowWhy] = useState(false);
  const [showChanges, setShowChanges] = useState(false);

  const isUser = message.role === "user";
  const isWeeklyReview = message.kind === "weekly_review";
  const isNudge = message.kind === "nudge";

  if (isUser) {
    return (
      <div className="flex justify-end fade-in">
        <div className="max-w-[80%] bg-user-bubble text-user-bubble-foreground bubble-radius px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
          {message.text}
        </div>
      </div>
    );
  }

  const showOptions = (message.ui_actions ?? []).find((a) => a.type === "show_options");

  return (
    <div className="flex flex-col gap-2 fade-in">
      {isWeeklyReview && <div className="border-t border-border/60 pt-2" />}
      <div className="flex justify-start">
        <div
          className={`max-w-[85%] bg-agent-bubble text-agent-bubble-foreground bubble-radius px-4 py-2.5 leading-relaxed whitespace-pre-wrap ${
            isWeeklyReview ? "text-lg" : "text-sm"
          }`}
        >
          {isNudge && (
            <Clock className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5 text-accent-warm" />
          )}
          {message.text}
        </div>
      </div>

      {!message.pending && (
        <div className="flex items-center gap-3 pl-1">
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
        <p className="text-xs italic text-muted-foreground pl-1 leading-relaxed max-w-[85%]">
          {message.why}
        </p>
      )}

      {showOptions?.options && showOptions.options.length > 0 && (
        <div className="flex flex-wrap gap-2 pl-1">
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
        <div className="pl-1">
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
        <div className="flex flex-wrap gap-2 pl-1 mt-1">
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
