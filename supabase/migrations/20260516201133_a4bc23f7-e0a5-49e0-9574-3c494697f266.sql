-- Add email column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_key ON public.profiles (email);

-- Update handle_new_user to also persist email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set email = excluded.email
  where public.profiles.email is distinct from excluded.email;
  return new;
end;
$function$;

-- Backfill: ensure every auth user has a profile row and an email
INSERT INTO public.profiles (id, email, display_name)
SELECT u.id, u.email, coalesce(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
FROM auth.users u
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email
WHERE public.profiles.email IS DISTINCT FROM EXCLUDED.email;