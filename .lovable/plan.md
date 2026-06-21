## Goal

Make Plan and Chat sections always show the user's data after login, even when the external n8n `/state` webhook is slow, fails, or the user is on a new device with no localStorage cache.

## Root cause

Today the baseline plan and chat history live in two unreliable places:
- **Baseline plan**: only in `localStorage` (`fc_onboard_seed`) and in n8n's response to `/webhook/state`. New device or cleared storage → nothing shows until n8n responds; if n8n fails, nothing ever shows.
- **Chat history**: only in n8n's `/webhook/state` response (`recent_turns`). Same failure mode.

Lovable Cloud (Supabase) already stores the profile but not the plan or messages.

## Fix — persist both to Lovable Cloud and use it as a guaranteed fallback

### 1. Database (new migration)

Add to `public.profiles`:
- `baseline_plan jsonb` — written at end of onboarding, read by Dashboard/Chat as a fallback when `state.current_plan` is absent.

New table `public.chat_messages`:
```
id uuid pk default gen_random_uuid()
user_id uuid not null references auth.users(id) on delete cascade
role text not null check (role in ('user','agent'))
text text not null
why text
plan_changes jsonb
ui_actions jsonb
kind text
created_at timestamptz default now()
```
Indexes: `(user_id, created_at)`. Enable RLS + GRANTs:
- `authenticated`: SELECT/INSERT own rows (`user_id = auth.uid()`).
- `service_role`: ALL.

### 2. Onboarding write

In `src/routes/Onboard.tsx` `submit()`, include `baseline_plan: res.baseline_plan` in the existing `profiles.upsert(...)` so the plan is saved alongside other onboarding answers.

### 3. Chat persistence

In `src/routes/Chat.tsx` `send()`:
- After appending the user message, insert it into `chat_messages`.
- After receiving the agent reply, insert it (with `why`, `plan_changes`, `ui_actions`).
- Fire-and-forget; failures don't block UI.

### 4. Reliable read layer

New hook `useUserData(userId)` in `src/lib/user-data.ts`:
- Fetches `profiles` (including `baseline_plan`) and the last ~50 `chat_messages` from Supabase in parallel on mount.
- Returns `{ baselinePlan, chatHistory, profile, loading }`.

### 5. Dashboard

In `src/routes/Dashboard.tsx`, derive `sessions` with priority:
1. `state.current_plan.sessions` (live from n8n)
2. `profile.baseline_plan.sessions` (Cloud) — **new guaranteed fallback**
3. `seed.baseline_plan.sessions` (localStorage)

This guarantees the weekly plan renders for any logged-in user who has onboarded.

### 6. Chat

In `src/routes/Chat.tsx`:
- Replace the localStorage-only greeting seed with: greeting from cloud chat history if present, else `state.recent_turns`, else welcome seed.
- Merge order on mount: Cloud `chat_messages` render immediately; when `state.recent_turns` arrives later and is longer/newer, reconcile by `created_at`.
- `today_session` / `TodayCard` falls back to `profile.baseline_plan` like Dashboard.

### 7. Profile fallback

`src/routes/Profile.tsx` already reads from `profiles`; verify it picks up the new `baseline_plan` field — no UI change required there.

## Non-goals

- Not changing the n8n webhook contract or API surface in `src/lib/api.ts`.
- Not removing the localStorage cache in `src/lib/polling.ts` — it stays as an additional speed boost.
- Not migrating existing users' plans backwards (only new onboardings populate `baseline_plan` in DB; existing users' plans will be saved the next time n8n returns one if we add a small effect, or stay on the localStorage path).

## Files touched

- `supabase/migrations/<new>.sql` — add column, create `chat_messages`, RLS, GRANTs.
- `src/routes/Onboard.tsx` — save `baseline_plan` to profiles.
- `src/routes/Chat.tsx` — persist & rehydrate messages from Cloud; use Cloud plan as fallback.
- `src/routes/Dashboard.tsx` — Cloud baseline plan fallback.
- `src/lib/user-data.ts` — new hook.

## Verification

- New account → onboard → reload Plan: weekly plan visible even with n8n offline.
- Send chat messages → reload → previous chat re-renders from Cloud instantly.
- Log in from a different browser/device → both Plan and Chat populate from Cloud.
