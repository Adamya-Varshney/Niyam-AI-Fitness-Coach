import type { ChatMessage, RecentTurn } from "@/lib/types";
import { ChatBubble } from "./ChatBubble";

interface WeeklyReviewBubbleProps {
  review: RecentTurn;
  onQuickReply?: (text: string) => void;
}

export function WeeklyReviewBubble({ review, onQuickReply }: WeeklyReviewBubbleProps) {
  const msg: ChatMessage = {
    id: `wr_${review.created_at ?? Math.random()}`,
    role: "agent",
    text: review.text,
    why: review.why,
    plan_changes: review.plan_changes,
    ui_actions: review.ui_actions,
    kind: "weekly_review",
  };
  return <ChatBubble message={msg} onChip={onQuickReply} />;
}
