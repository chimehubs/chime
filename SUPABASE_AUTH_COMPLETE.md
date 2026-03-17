# Supabase & Authentication Setup - Complete Guide

This document provides a complete overview of how authentication and Supabase integration have been set up in this app.

## What's Been Done

### 1. Supabase Client Service
File: `src/services/supabaseClient.ts`
- Initializes Supabase client with your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Provides helpers for realtime messages, file uploads, and unread counts
- Falls back gracefully when Supabase isn't configured (uses localStorage)

### 2. Supabase Auth Service
File: `src/services/supabaseAuth.ts`
- `signUp(email, password, fullName)` — creates auth user and syncs to `users` table
- `signIn(email, password)` — authenticates and fetches user profile
- `signOut()` — clears session
- `getCurrentUser()` — fetches current authenticated user
- `onAuthStateChanged(callback)` — subscribes to auth state changes (realtime)

### 3. Updated AuthProvider
File: `src/context/AuthProvider.tsx`
- Now syncs Supabase auth state on mount
- Listens to Supabase auth changes via `onAuthStateChanged`
- Falls back to localStorage for non-Supabase flows
- `logout()` now calls `supabaseAuth.signOut()` to clear server-side session

### 4. Integrated Login Component
File: `src/app/components/auth/Login.tsx`
- Calls `supabaseAuth.signIn()` with email/password
- Displays error messages from auth failures
- Routes to `/admin` for admin users, `/dashboard` for regular users
- Shows demo credentials (alice@example.com, bob@example.com, admin@example.com)

### 5. Integrated Register Component
File: `src/app/components/auth/Register.tsx`
- Calls `supabaseAuth.signUp()` to create account
- Creates user record in `users` table automatically
- Shows error messages
- Validates form (passwords match, nationality, currency)

### 6. Database Schema
Migrations in `supabase/migrations/001_create_core_tables.sql`:
- `users` table with role (`admin` | `user`), kyc_status, email
- `accounts` table with balance, account_number, currency
- `transactions` table with type, amount, status
- `kyc_submissions` table for document tracking
- `messages` table for chat (already wired to Chat.tsx)

### 7. Row Level Security (RLS)
Policies in `supabase/policies/messages_rls_policies.sql`:
- Users can only read/write their own data
- Admins can read all data
- Service role can perform server-side operations

### 8. Realtime Chat
File: `src/app/components/user/Chat.tsx`
- Opens Supabase realtime subscription when configured
- Falls back to localStorage polling when Supabase unavailable
- Files upload to `chat-files` Supabase Storage bucket

### 9. Admin Dashboard Unread Counts
File: `src/app/components/admin/AdminDashboard.tsx`
- Fetches unread message count from Supabase
- Falls back to localStorage polling

## What You Need to Do

### Step 1: Verify Supabase Database is Ready
- ✅ Created Supabase project (done: https://rwfgwwzodjbudoothohs.supabase.co)
- ✅ Ran core tables migration (users, accounts, transactions, messages)
- ✅ Enabled RLS on all tables
- ✅ Seeded demo data (alice, bob, admin users)
- ✅ Created `chat-files` storage bucket

### Step 2: Enable Supabase Auth
In Supabase dashboard:
1. Go to **Authentication → Settings**
2. Enable **Email/Password** provider
3. Set email confirmation to "Optional" or "Required" (your choice)
4. Save

### Step 3: Create Demo Users in Supabase Auth
In Supabase dashboard → Authentication → Users:
1. Click **Invite** (top right) or **Generate Link**
2. For each user, send invite: alice@example.com, bob@example.com, admin@example.com
3. Users will set their own passwords

**OR** use the server-side script to create them programmatically (contact deployment to set SUPABASE_SERVICE_ROLE_KEY)

### Step 4: Test Login/Signup Locally
1. Run the dev server:
   ```bash
   npm run dev
   ```
2. Navigate to `/login`
3. Try signing in with one of the seeded users
4. Verify redirect to dashboard or admin
5. Try `/register` to sign up a new user

### Step 5: Verify Chat & Realtime
1. Sign in as one user, open chat
2. Open admin dashboard in another tab/browser
3. Send a message from the user chat
4. Verify it appears in admin chat in realtime (live update)
5. Check that unread count badge updates on admin dashboard

### Step 6: Deploy
Set these env vars in your Netlify environment:
```
VITE_SUPABASE_URL=https://rwfgwwzodjbudoothohs.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_BZ2krGN-tgrz78_y2HiHYg_tPMeCJAY
```

## Testing Checklist

- [ ] User can sign up with email/password
- [ ] User can sign in
- [ ] User role is correctly identified (admin vs user)
- [ ] Logout clears session
- [ ] Chat messages sync in realtime
- [ ] File uploads to Supabase Storage
- [ ] Admin sees unread count badge
- [ ] RLS policies prevent users from seeing each other's data (test in browser console)

## Troubleshooting

**"Supabase not configured" error**
- Verify `.env.local` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart dev server: `npm run dev`

**Sign in fails with "Invalid login credentials"**
- Verify user exists in Supabase → Authentication → Users
- Check email/password are correct
- Ensure email/password auth provider is enabled in auth settings

**RLS blocks reads**
- Ensure policy allows `select` for authenticated users
- Test with admin user (should have broader access)
- Check `auth.uid()` matches the user's UUID in the database

**Chat not syncing in realtime**
- Check browser console for Supabase connection errors
- Verify realtime is enabled for `messages` table (Database → Replication)
- Verify `messages` RLS policy allows select

## Next Steps

1. Create email verification (optional but recommended for production)
2. Add password reset flow
3. Implement KYC submission and approval workflow
4. Add transaction history queries
5. Wire Dashboard balance/spending to Supabase queries
6. Add admin approval endpoints for deposits/withdrawals

## Additional Resources

- Supabase Docs: https://supabase.com/docs
- Auth: https://supabase.com/docs/guides/auth
- Realtime: https://supabase.com/docs/guides/realtime
- Row Level Security: https://supabase.com/docs/guides/auth/row-level-security
