ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS goal text,
  ADD COLUMN IF NOT EXISTS current_activity text,
  ADD COLUMN IF NOT EXISTS time_per_week_min integer,
  ADD COLUMN IF NOT EXISTS experience_level text,
  ADD COLUMN IF NOT EXISTS workout_styles text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS equipment text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS injuries text,
  ADD COLUMN IF NOT EXISTS dietary_preference text;