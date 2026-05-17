## Diagnosis

The chat *does* eventually load — but for ~7+ seconds after navigating to `/chat`, the page is completely blank (no greeting, no TodayCard). Verified in the live preview:

- `GET https://info15779.n8n-wsk.com/webhook/state?user_id=…` returns **200 in 7.3s**.
- During that wait, `polling.firstAttemptDone` is `false`, so the hydration `useEffect` in `Chat.tsx` short‑circuits and **never sets the welcome message**.
- The header slot also renders an empty `<div className="h-16" />` because there is no `today_session` yet.
- Once the slow response arrives, the welcome bubble appears — but the n8n payload has `today_session: null` and the `recent_turns` live under `profile.recent_turns_json` (string), not at the top level, so the TodayCard still never renders even though `current_plan.plan_json` clearly contains today's session.

So the user perceives "Chat isn't loading" because the first paint is empty for several seconds and TodayCard is permanently missing.

## Fix

Make Chat render usefully on first paint, independent of the slow webhook.

### 1. `src/routes/Chat.tsx` — don't block initial UI on polling

- Remove the `if (!polling.firstAttemptDone) return;` guard in the hydration `useEffect`. Set the welcome / seed messages immediately on mount (still only once via `hydratedRef`).
- When `polling.firstAttemptDone` later flips and `polling.state?.recent_turns` arrives, merge real turns in (replace the seeded greeting if turns exist).
- Header slot: while polling is in flight and we have no `todaySession`, show a lightweight skeleton (or the seeded TodayCard) instead of the empty `h-16` placeholder. Only fall back to `BackendPlaceholder` after the first attempt completes *and* nothing usable came back.

### 2. Derive `today_session` from `current_plan` when `state.today_session` is null

The n8n response includes `current_plan.plan_json` (a JSON string of `{week_number, sessions:[…]}`). Add a small helper in `Chat.tsx` (or `src/lib/polling.ts`):

```ts
function deriveTodaySession(state): SessionPlan | undefined {
  if (state?.today_session) return state.today_session;
  const raw = state?.current_plan?.plan_json;
  if (!raw) return undefined;
  try {
    const plan = typeof raw === "string" ? JSON.parse(raw) : raw;
    const today = new Date().toLocaleDateString("en-US", { weekday: "short" }); // "Mon", "Tue"…
    return plan.sessions?.find((s) => s.day === today) ?? plan.sessions?.[0];
  } catch { return undefined; }
}
```

Use this for `todaySession` in the TodayCard render.

### 3. Robust `recent_turns` hydration

Also accept `state.profile?.recent_turns_json` (string) as a fallback when top‑level `recent_turns` is missing, so prior chat history surfaces once the API is wired through.

## Out of scope

- No changes to n8n, Supabase, auth, or the onboarding gate. The onboarding redirect already works correctly — the slow webhook on Chat is the visible problem.
