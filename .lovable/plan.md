## Goal

Drop the redundant `/profile/setup` step from the new-user journey. After onboarding, users go straight to `/chat`. The setup screen remains available as an edit screen reachable from `/profile`.

## Changes

### 1. `src/routes/Onboard.tsx`
- In `submit()`, include `onboarded_at: new Date().toISOString()` in the `profiles` update so onboarding marks the user complete immediately.
- Change `finish()` to `navigate("/chat")` instead of `/profile/setup`.
- Update the result-screen CTA label from "Continue to your profile" to "Start chatting with your coach" (or similar).
- Keep the `fc_onboard_seed` localStorage write so Chat can hydrate the welcome state.

### 2. `src/routes/ProfileSetup.tsx`
- No behavior change required for edit use. It already sets `onboarded_at` on save and navigates onward — that's fine when entered manually from `/profile`.
- Optional: change its post-save navigation to `/profile` (instead of `/chat`) since it's now an edit screen, not a step. Will confirm in implementation.

### 3. No routing changes
- `/profile/setup` route stays mounted (still used as an edit entry point from the Profile page).
- `RequireAuth` rules unchanged.

## Out of scope
- n8n webhook payloads, schema, and the onboarding question flow itself stay exactly as they are.
