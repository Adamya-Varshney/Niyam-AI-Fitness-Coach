# Fitness Coach App — Build Plan

A chat-first, voice-augmented fitness coach with three routes (`/onboard`, `/chat`, `/dashboard`), built to ship gracefully even while three of the four backend webhooks are still being built.

## Routing & boot behavior

- `BrowserRouter` with routes: `/onboard`, `/chat`, `/dashboard`, plus a root redirect.
- On boot: read `fc_user_id` from `localStorage`. Missing → redirect to `/onboard`. Present → redirect to `/chat`.
- `UserContext` provides `userId` to all routes.

## API client (`src/lib/api.ts` + `src/lib/types.ts`)

Four typed wrappers around `fetch`, all using `VITE_N8N_BASE_URL` + bearer token from `VITE_N8N_API_KEY`:

- `postOnboard`, `postChat`, `getState`, `postNudgeAck`
- 12-second `AbortSignal.timeout(12000)`
- `message_id` via `crypto.randomUUID()` on every POST for idempotency
- Typed `ApiError` carrying HTTP status (so callers distinguish 404 "not yet built" from 500 "real error" from network/timeout)
- `withFallback(apiCall, fallbackBehavior)` wrapper centralises the degradation rules below — used everywhere

### Backend degradation (single source of truth)

| Call | 404 | 500 / network / timeout |
|---|---|---|
| `postChat` | Soft agent bubble: "Your coach is still warming up…" + composer disabled 3s | Soft agent bubble: "Hmm, I didn't catch that…" + retry chip |
| `getState` | Render `<BackendPlaceholder />` with "Your week / Live updates coming soon…" | Keep last good state; never blank |
| `postNudgeAck` | Silent | Silent |
| `postOnboard` | Inline error + retry (only call where the user is blocked) | Inline error + retry |
| Polling tick | — | Silent; mark `isStale` after 2+ consecutive fails |

No red error UI anywhere except onboarding. No technical messages ever surfaced.

## State (`src/lib/polling.ts`)

`useStatePolling(userId)` returns `{ state, refresh, isStale }`:

- Fetches on mount, then every 60s while `document.visibilityState === "visible"`
- Pauses on `visibilitychange` to hidden, resumes on visible
- `refresh()` exposed for chat round-trips to call
- Errors: keep last good state; `isStale = true` after 2 consecutive failures
- Cleans up interval + listeners on unmount

No Redux / Zustand / React Query — just Context + this hook.

## Route: `/onboard`

Single full-viewport column, one question at a time, 600ms ease-out cross-fade, no progress bar, no back button.

1. **Q1 (goal)** — heading "What's the result you're after?", four stacked tap-targets (Build strength / Get lean / Feel better / Move more). Auto-advance 400ms after tap.
2. **Q2 (current activity)** — same pattern (Rarely / Weekend only / A few times a week / Most days).
3. **Q3 (time)** — slider 60–360 step 15, default 180, live `{value} min/week (~{h}h)` label, "Continue" button.

On submit: generate `userId = crypto.randomUUID()`, call `postOnboard`, persist `fc_user_id`, render `welcome_message` + `baseline_plan` in a "Here's your week" card with collapsible exercise sub-lists. CTA "Let's go" → `/chat`.

If `postOnboard` fails: inline error + retry (this is the only blocking call).

## Route: `/chat`

Three-zone mobile-first layout:

```text
┌─────────────────────────┐
│ TodayCard (pinned)      │
├─────────────────────────┤
│                         │
│ chat thread (scroll)    │
│ — anchored to bottom    │
│                         │
├─────────────────────────┤
│ [text input]    [🎙]    │
└─────────────────────────┘
```

### TodayCard
- Title: `today_session.focus` (fallback `type`), subtitle `{duration_min} min`
- Corner "Why this?" link → toggles 1–2 line rationale
- "View exercises" expands `{name} — {sets} × {reps}` rows
- If state never loaded: `<BackendPlaceholder />`
- If `welcome_back_message` present: dismissible banner above card, shown once per session per new message

### Chat thread
- On mount: hydrate from `state.recent_turns`. If unavailable: single welcome bubble "Hi — I'm here. Tell me how today's going."
- Send via `postChat`, show `<TypingIndicator />` while in flight
- Agent bubble layers (in order): reply text → "why?" disclosure → `show_options` chip row → plan-changes pill ("Your week was updated" → expands `{day}: {old} → {new}`)
- After every successful round-trip: call `refresh()` to update TodayCard
- Composer never blocks; users can queue follow-ups

### Pending nudges
- On each poll: render new nudges as ambient agent bubbles at top with clock dot icon
- Fire `postNudgeAck` (silent on failure)
- Track rendered IDs in a `Set` ref; never inject duplicates; never disturb scroll position

### Weekly review bubbles
- Detected by `kind === "weekly_review"`; larger text, divider above, three quick-reply chips (Looks good / Tweak Thursday / Talk it through). First two send canned messages; third focuses composer.

### Composer
- Text always enabled, Enter sends, Shift+Enter newline
- Hold-to-record mic button using `MediaRecorder` (`audio/webm`), pulsing red dot + duration while held, base64-encoded on release, sent with `message_type: "voice"`
- Each agent bubble has a play icon → `window.speechSynthesis` (prefer Samantha on iOS, Google US English elsewhere). Opt-in only, never auto-play.

## Route: `/dashboard`

Read-only single column, three sections:

1. **Today** — same `<TodayCard />` + "Start →" button to `/chat`. Placeholder if state unavailable.
2. **This week** — `current_plan.sessions` list: `Day · Focus · {duration_min} min · {status}` (status computed: completed / today / pending). No edit affordances. Fallback copy if state unavailable.
3. **How it's going** — single line: `{last_7d} sessions this week · {streak_weeks}-week streak`. **Omitted entirely** if state unavailable (no placeholder — silence is better).

"Talk it over" link at bottom → `/chat`. All plan changes happen via chat, never the dashboard.

## Components (`src/components/`)

`QuestionCard`, `TodayCard`, `ChatBubble`, `TypingIndicator`, `VoiceRecordButton`, `NudgeBubble`, `WeeklyReviewBubble`, `Composer`, `BackendPlaceholder` — all minimal, typed props as specified.

## Design tokens (`tailwind.config.ts` + `index.css`)

- Fonts: `font-sans` Inter; `font-display` Source Serif 4 (onboarding question headings only)
- Colors via HSL CSS variables: bg stone-50/950, agent-bubble stone-100/900, user-bubble indigo-600 / white text, muted stone-500, accent-warm amber-400, accent-cool sky-400
- Radius: 12px bubbles, 16px cards
- Default motion: `transition-all duration-300 ease-out`. No springs, no bounce, no confetti, no gamified motion.
- Add Google Fonts links to `index.html` for Inter + Source Serif 4

## Non-negotiables (verified throughout)

- No streak/missed-session shaming; no red "you broke your streak" alerts
- `motivation_style` never rendered; tone lives in copy only
- Composer input never disabled while a response is pending
- Adherence is read-only; plan changes happen exclusively via chat
- Nudges and weekly reviews are in-thread bubbles only — never modals/toasts/popups
- TodayCard updates silently after re-plans
- TTS is opt-in tap-to-play
- Chat errors → inline retry chip, never red alerts
- Backend-not-built → `<BackendPlaceholder />`, never raw 404s

## File structure

```text
src/
  lib/        api.ts, types.ts, polling.ts
  components/ QuestionCard, TodayCard, ChatBubble, TypingIndicator,
              VoiceRecordButton, NudgeBubble, WeeklyReviewBubble,
              Composer, BackendPlaceholder
  routes/     Onboard.tsx, Chat.tsx, Dashboard.tsx
  App.tsx     Router + UserContext + boot redirect
  main.tsx
```

## Environment variables

The user will supply `VITE_N8N_BASE_URL` and `VITE_N8N_API_KEY`. Note: with `VITE_` prefix these are bundled into the client and visible to anyone inspecting the app — fine for prototyping, but not safe for public production. (Flagging for awareness; building as specified.)
