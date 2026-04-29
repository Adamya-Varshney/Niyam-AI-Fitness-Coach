import type { Nudge, ChatMessage } from "@/lib/types";
import { ChatBubble } from "./ChatBubble";

interface NudgeBubbleProps {
  nudge: Nudge;
  onSeen?: (id: string) => void;
}

/**
 * Thin presentational wrapper around ChatBubble for ambient nudge messages.
 * Acknowledgement (postNudgeAck) is handled by the Chat route on first render
 * via the onSeen callback.
 */
export function NudgeBubble({ nudge, onSeen }: NudgeBubbleProps) {
  const msg: ChatMessage = {
    id: nudge.id,
    role: "agent",
    text: nudge.text,
    kind: "nudge",
  };
  // Defer onSeen to next tick to avoid render-phase side effects
  if (onSeen) queueMicrotask(() => onSeen(nudge.id));
  return <ChatBubble message={msg} />;
}
