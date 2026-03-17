# Supabase Auth Setup

This app uses Supabase Auth with **email/password only**.

## 1) Providers
In Supabase:
- `Authentication -> Providers`
- Enable `Email`
- Disable `Google`

## 2) User profile creation
`supabase/schema.sql` installs a trigger on `auth.users` that auto-creates `public.profiles` for each new signup.

## 3) Roles
Roles are stored in `public.profiles.role` (`user` or `admin`).

Promote an admin after signup:
```sql
update public.profiles
set role = 'admin', status = 'ACTIVE'
where email = 'admin@your-domain.example.com';
```

## 4) Client auth methods in code
- Sign up: `signUpWithSupabase(email, password, ...)`
- Sign in: `signInWithSupabase(email, password)`
- Sign out: `signOutFromSupabase()`

Source file:
- `src/services/supabaseAuthService.ts`

## 5) Security notes
- Never expose service role keys in frontend env files.
- Keep redirect URLs strict and explicit.
- Use RLS from `supabase/schema.sql` for all data access control.
