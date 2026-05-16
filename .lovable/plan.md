## Goal

1. A returning user (same email + password) who has already completed onboarding once must skip the onboarding flow on every future sign-in.
2. The `user_id` sent to the n8n workflows must be the same stable unique identifier that's tied to the user's email + password combination, and it must be visible/saved alongside the email in our database.

## What already works

- `user_id` passed to n8n is `supabase.auth.user.id` — a UUID created at signup and tied 1:1 to the email/password account for life. This is already the unique identifier you asked for.
- `profiles.id` = that same UUID. A trigger `on_auth_user_created` already creates a profiles row at signup.
- `RootRedirect` and `RequireAuth` already check `profiles.onboarded_at` and route completed users straight to `/chat`, sending only pending users to `/onboard`.

## What's missing / risky

- `Onboard.tsx` uses `.update()` on the profiles row. If a profile row is ever missing (e.g. legacy users that signed up before the trigger existed, or a race on first login), the update silently no-ops, `onboarded_at` never gets set, and the user is forced through onboarding every time.
- The profile row has no `email` column, so the user_id ↔ email mapping isn't visible in our own database — it lives only in the `auth.users` table.

## Plan

### 1. Database migration

- Add `email TEXT UNIQUE` column to `public.profiles`.
- Update the `handle_new_user` trigger function to also write `new.email` into the profile row on signup.
- Backfill: for every existing `auth.users` row, upsert a `profiles` row with `id` + `email` + display_name (so any legacy account without a profile row gets one, and emails get populated for current users).

This makes `(profiles.id, profiles.email)` the single source of truth for "this user_id belongs to this email account."

### 2. Onboarding write — switch update → upsert

In `src/routes/Onboard.tsx`, change the `supabase.from("profiles").update({...}).eq("id", userId)` call to an `upsert({ id: userId, ...fields, onboarded_at: ... })`. This guarantees `onboarded_at` is persisted even if the row was missing, so the "skip onboarding next time" check becomes 100% reliable.

### 3. No change needed to redirect logic

`RootRedirect` (in `App.tsx`) and `RequireAuth` already do the right thing once `onboarded_at` is set:
- Signed-in + onboarded → `/chat`
- Signed-in + not onboarded → `/onboard`
- Signed-out → `/auth`

After steps 1 + 2, every account that has finished onboarding once will go straight to `/chat` on every future login, on any device.

### 4. No change needed to the n8n payload

`postOnboard({ user_id: userId, ... })` in `Onboard.tsx` and the other `/webhook/*` calls already send the Supabase auth UUID. With the new `email` column on profiles, you (or n8n, via a future read) can always resolve `user_id ↔ email` from our database.

## Files touched

- New SQL migration (profiles.email + trigger update + backfill)
- `src/routes/Onboard.tsx` — one call site changed from `update` to `upsert`

No UI/visual changes.