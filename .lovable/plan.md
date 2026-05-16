## Goal

One linear user journey, no skippable steps:

```
Name → Goal → Time per week → Profile (incl. required experience level) → Chat
```

The four experience levels (Beginner, Intermediate, Advanced, Elite) become a mandatory attribute of every user.

## Changes

### 1. Onboarding flow (`src/routes/Onboard.tsx`)
- Remove the "current activity" step from the visible flow. Send a sensible default (`few_times_week`) to the onboard webhook so the backend contract stays unchanged.
- New step order: `name → goal → time → submitting → result`.
- On the result screen, collapse the two buttons into a single primary CTA **"Continue to your profile"** that routes to `/profile/setup`. Remove the "Let's go / Skip" split so the journey is linear.

### 2. Profile setup (`src/routes/ProfileSetup.tsx`)
- Reframe copy: this is step 4 of onboarding, not an optional add-on. Header becomes "A few last details" with subtitle explaining experience level is required, others optional.
- Make `experience_level` **required**:
  - zod schema: drop `.optional()`, add a friendly `required_error`.
  - Save button disabled until an experience level is selected.
  - Show inline validation if the user tries to save without it.
- Remove the "Skip for now" ghost button (no skipping the journey).
- After save (success or local-fallback), navigate to `/chat` as today.
- The Profile page edit-in-place flow (entered from `/profile`) keeps the same form; the "required" rule still applies there.

### 3. Types (`src/lib/types.ts`)
- Change `experience_level` on `ProfilePreferences` from optional to required.
- Anywhere this widens existing reads (Profile.tsx, Chat seed), guard with `prefs.experience_level ?? undefined` so older localStorage payloads without the field don't crash.

### 4. Profile page (`src/routes/Profile.tsx`)
- Since experience is now part of the core profile, surface it more prominently (move it above the optional sections). If a legacy user has no value stored, show a one-line "Set your experience level" prompt linking to `/profile/setup`.

### 5. App routing (`src/App.tsx`)
- `AppNav` continues to hide on `/onboard` and `/profile/setup` so the linear flow is undistracted.
- No new routes needed.

### Out of scope
- N8N webhook payloads/endpoints stay exactly as they are. Only the client-side journey and the required-ness of `experience_level` change.
- No backend/business-logic changes; this is UX wiring only.

## Result

After approval, a brand-new user can only reach `/chat` by completing Name → Goal → Time → Profile (with an experience level chosen). Returning users still land directly on `/chat` via `RootRedirect`.
