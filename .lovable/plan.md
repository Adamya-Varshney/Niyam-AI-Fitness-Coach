## Chat UI polish — messaging-app feel

Two focused changes to the chat transcript. The composer, Today card, and chat layout stay as they are.

### 1. Render the AI coach's text cleanly

Right now agent replies sometimes arrive with literal `**bold**` markdown and render the asterisks as characters. Add a tiny inline markdown renderer used by `ChatBubble` for agent messages:

- `**text**` → `<strong>text</strong>`
- `*text*` / `_text_` → `<em>em</em>`
- backtick `` `code` `` → inline `<code>` chip
- Bare URLs → clickable links
- Preserve line breaks (current `whitespace-pre-wrap` stays)
- Strip leading/trailing stray `**` that wrap the whole message (the specific case the user flagged)

Keep it dependency-free (small regex-based renderer, ~40 lines) so we don't pull in `react-markdown`. User messages stay plain text — no markdown parsing on the user side.

### 2. WhatsApp / Instagram-style bubbles

Restyle just `ChatBubble.tsx` and the supporting tokens — no layout changes to `Chat.tsx`.

Visual moves:
- **User bubble**: right-aligned, solid accent fill (current `bg-user-bubble`), tighter corner on the bottom-right (`rounded-2xl rounded-br-md`), subtle drop shadow, max-width ~75%.
- **Agent bubble**: left-aligned, soft neutral surface, tighter corner on the bottom-left (`rounded-2xl rounded-bl-md`), no border, slightly larger line-height for readability.
- **Tails**: small CSS pseudo-element tail on the inside corner of each bubble (classic chat-app cue), color-matched to the bubble.
- **Grouping**: consecutive same-role messages collapse vertical gap (8px within group, 16px between groups) and only the last in a group gets the tail — feels like iMessage/WhatsApp threading.
- **Timestamp + read state**: tiny 11px muted timestamp under the last message of each group, right-aligned for user, left-aligned for agent. Pulled from `created_at` when available, otherwise omitted.
- **Avatar**: small circular coach avatar (initial "N" on a warm gradient) next to the first agent message in a group; user side stays avatar-less like WhatsApp.
- **Action row** (`Play`, `why?`, `Try again`): shrinks to icon-only on hover, fades in instead of always-visible — keeps the transcript clean.
- **Fade-in stays**, plus a 1px translate-up on enter for a softer settle.

### Technical details

Files touched:
- `src/components/ChatBubble.tsx` — new inline markdown renderer, new bubble classes, avatar, timestamp, grouping-aware props (`isFirstInGroup`, `isLastInGroup`).
- `src/routes/Chat.tsx` — compute `isFirstInGroup` / `isLastInGroup` by walking `messages` and pass to each `ChatBubble`. No structural changes.
- `src/index.css` — extend `bubble-radius` into `.bubble-user` / `.bubble-agent` with pseudo-element tails; add `.bubble-group-gap` spacing helper.
- `src/lib/types.ts` — add optional `created_at?: string` to `ChatMessage` so the timestamp can render when available (already present on `RecentTurn`).
- `src/assets/coach-avatar.png` — generate a small warm-gradient avatar mark for the agent side.

Non-goals:
- No changes to composer, Today card, chat header, scroll behavior, or message persistence.
- No new dependencies (no `react-markdown`, no AI Elements migration for this pass).
- No threading/multi-conversation UI — single chat surface stays.

### Verification

- Send a message that includes `**bold**`, `*italic*`, `` `code` ``, and a URL → renders styled, no stray asterisks.
- Send three messages in a row → they group with a single tail + timestamp at the bottom.
- Reload chat with existing history → bubbles look like a DM thread, not flat blocks.
- Light/dark both pass contrast on user and agent bubbles.
