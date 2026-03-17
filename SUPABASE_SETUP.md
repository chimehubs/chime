# Supabase Setup (Canonical)

Use this setup for a fresh Supabase project. The app now has one canonical SQL bootstrap:

- `supabase/schema.sql` (tables, RPC, storage buckets, and RLS)
- `supabase/bootstrap_admin.sql` (promote admin + validation queries)

## 1) Create Supabase project
1. Create a new project in Supabase.
2. In `Authentication -> Providers`, enable **Email** and disable **Google**.
3. In `Authentication -> URL Configuration`, set your production site URL and redirect URLs.

## 2) Run SQL
1. Open SQL Editor.
2. Run `supabase/schema.sql`.
3. Run `supabase/bootstrap_admin.sql` (after at least one user signs up) and replace the admin email.

## 3) Configure environment
Copy template values into your local and deployment env settings.

Required frontend env vars:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `VITE_SITE_URL`

Template files:
- `.env.example`
- `.env.supabase.template`
- `.env.production.template`

## 4) Verify app flows
- Register with email/password only.
- Create account from dashboard and confirm account/card are generated.
- Confirm admin can view users, transactions, deposits, and chat.
- Confirm user and admin can both read/write chat messages.

## 5) Deployment trust/safety checklist
These steps help reduce security warnings and improve reputation:
- Use your own verified domain (avoid disposable preview URLs for production).
- Keep brand/legal pages complete (`/about`, `/privacy-policy`, `/terms`, `/contact`).
- Remove misleading/third-party branding and unsupported compliance claims.
- Keep all content and links consistent with your actual business identity.
- Submit your domain to Google Search Console and Safe Browsing review if previously flagged.

Note: no code change can guarantee Safe Browsing outcomes; reputation, domain history, and content authenticity also matter.
