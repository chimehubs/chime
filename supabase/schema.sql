-- Chimehubs Supabase Full Setup
-- Run this entire file in the Supabase SQL editor for a fresh project.

create extension if not exists "pgcrypto";

-- =========================
-- Core Tables
-- =========================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  first_name text,
  last_name text,
  phone text,
  role text not null default 'user' check (role in ('user', 'admin')),
  status text not null default 'UNREGISTERED' check (status in ('UNREGISTERED', 'ACTIVE', 'SUSPENDED')),
  nationality text,
  gender text,
  date_of_birth date,
  house_address text,
  occupation text,
  salary_range text,
  primary_account_type text check (primary_account_type in ('CHECKING', 'SAVINGS')),
  currency text not null default 'USD',
  avatar_url text,
  chat_last_seen_at timestamptz,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_number text not null unique,
  routing_number text not null,
  account_type text not null check (account_type in ('CHECKING', 'SAVINGS')),
  currency text not null default 'USD',
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'CLOSED', 'SUSPENDED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.virtual_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  card_number text not null,
  expiry_date text not null,
  cvv text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'FROZEN', 'CANCELLED')),
  daily_limit numeric(12, 2) not null default 5000,
  monthly_limit numeric(12, 2) not null default 50000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  type text not null check (type in ('credit', 'debit')),
  amount numeric(12, 2) not null check (amount >= 0),
  description text not null,
  currency text not null,
  status text not null default 'completed' check (status in ('completed', 'pending', 'failed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  description text not null,
  amount numeric(12, 2),
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  message text not null,
  type text default 'info',
  path text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('add_money', 'send_money')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, type)
);

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id),
  unique (id, user_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  sender_type text not null check (sender_type in ('user', 'admin')),
  message text not null,
  attachment_url text,
  reply_to_message_id uuid references public.chat_messages(id) on delete set null,
  read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint chat_messages_thread_user_fk
    foreign key (thread_id, user_id)
    references public.chat_threads(id, user_id)
    on delete cascade
);

-- =========================
-- Indexes
-- =========================

create index if not exists idx_accounts_user_id on public.accounts(user_id);
create index if not exists idx_virtual_cards_user_id on public.virtual_cards(user_id);
create index if not exists idx_virtual_cards_account_id on public.virtual_cards(account_id);
create index if not exists idx_transactions_user_id on public.transactions(user_id);
create index if not exists idx_transactions_account_id on public.transactions(account_id);
create index if not exists idx_transactions_created_at on public.transactions(created_at desc);
create index if not exists idx_activities_user_id on public.activities(user_id);
create index if not exists idx_chat_messages_reply_to_message_id on public.chat_messages(reply_to_message_id);
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_read on public.notifications(user_id, read);
create index if not exists idx_profiles_chat_last_seen_at on public.profiles(chat_last_seen_at desc);
create index if not exists idx_chat_threads_user_id on public.chat_threads(user_id);
create index if not exists idx_chat_messages_thread_id on public.chat_messages(thread_id);
create index if not exists idx_chat_messages_user_id on public.chat_messages(user_id);
create index if not exists idx_chat_messages_created_at on public.chat_messages(created_at desc);

alter table public.chat_messages replica identity full;

-- =========================
-- Utility Functions + Triggers
-- =========================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_accounts_updated_at on public.accounts;
create trigger trg_accounts_updated_at
before update on public.accounts
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_virtual_cards_updated_at on public.virtual_cards;
create trigger trg_virtual_cards_updated_at
before update on public.virtual_cards
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_transactions_updated_at on public.transactions;
create trigger trg_transactions_updated_at
before update on public.transactions
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_drafts_updated_at on public.drafts;
create trigger trg_drafts_updated_at
before update on public.drafts
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_chat_threads_updated_at on public.chat_threads;
create trigger trg_chat_threads_updated_at
before update on public.chat_threads
for each row execute procedure public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
end;
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.enforce_chat_message_update_permissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if auth.uid() is distinct from old.user_id or old.sender_type <> 'admin' then
    raise exception 'Only admins can modify sent chat messages.';
  end if;

  if new.id is distinct from old.id
    or new.thread_id is distinct from old.thread_id
    or new.user_id is distinct from old.user_id
    or new.sender_type is distinct from old.sender_type
    or new.message is distinct from old.message
    or new.attachment_url is distinct from old.attachment_url
    or new.created_at is distinct from old.created_at then
    raise exception 'Only read receipt updates are allowed for users.';
  end if;

  if new.read is not true then
    raise exception 'Users can only mark admin messages as read.';
  end if;

  if new.read_at is null then
    new.read_at = coalesce(old.read_at, now());
  end if;

  return new;
end;
$$;

drop trigger if exists trg_chat_messages_update_permissions on public.chat_messages;
create trigger trg_chat_messages_update_permissions
before update on public.chat_messages
for each row execute procedure public.enforce_chat_message_update_permissions();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1), 'User'),
    'user',
    'UNREGISTERED'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- =========================
-- Account Creation RPC
-- =========================

create or replace function public.create_account(
  first_name text,
  last_name text,
  middle_name text,
  gender text,
  date_of_birth text,
  nationality text,
  house_address text,
  occupation text,
  salary_range text,
  account_type text,
  currency text,
  avatar_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _user_id uuid := auth.uid();
  _account public.accounts;
  _card public.virtual_cards;
  _routing text;
  _account_number text;
  _card_number text;
  _expiry text;
  _cvv text;
begin
  if _user_id is null then
    raise exception 'Not authenticated';
  end if;

  if exists (
    select 1
    from public.accounts
    where user_id = _user_id and status <> 'CLOSED'
  ) then
    raise exception 'Account already exists for this user';
  end if;

  loop
    _account_number := lpad((floor(random() * 100000000000))::text, 11, '0');
    exit when not exists (
      select 1 from public.accounts where account_number = _account_number
    );
  end loop;

  _routing := lpad((floor(random() * 1000000000))::text, 9, '0');

  insert into public.accounts (user_id, account_number, routing_number, account_type, currency)
  values (_user_id, _account_number, _routing, account_type, currency)
  returning * into _account;

  loop
    _card_number := lpad((floor(random() * 10000000000000000))::text, 16, '0');
    exit when not exists (
      select 1 from public.virtual_cards where card_number = _card_number
    );
  end loop;

  _expiry := to_char(now() + interval '5 years', 'MM/YY');
  _cvv := lpad((floor(random() * 1000))::text, 3, '0');

  insert into public.virtual_cards (user_id, account_id, card_number, expiry_date, cvv)
  values (_user_id, _account.id, _card_number, _expiry, _cvv)
  returning * into _card;

  update public.profiles
  set
    first_name = create_account.first_name,
    last_name = create_account.last_name,
    name = trim(concat(create_account.first_name, ' ', create_account.middle_name, ' ', create_account.last_name)),
    gender = create_account.gender,
    date_of_birth = create_account.date_of_birth::date,
    nationality = create_account.nationality,
    house_address = create_account.house_address,
    occupation = create_account.occupation,
    salary_range = create_account.salary_range,
    primary_account_type = create_account.account_type,
    currency = create_account.currency,
    avatar_url = create_account.avatar_url,
    status = 'ACTIVE'
  where id = _user_id;

  insert into public.transactions (user_id, account_id, type, amount, description, currency, status, metadata)
  values (
    _user_id,
    _account.id,
    'credit',
    10,
    'Onboarding Welcome Bonus',
    currency,
    'completed',
    '{"source":"onboarding"}'::jsonb
  );

  insert into public.activities (user_id, type, description, amount)
  values (_user_id, 'credit', 'Onboarding Welcome Bonus', 10);

  insert into public.notifications (user_id, title, message, type, read, path)
  values (
    _user_id,
    'Welcome to Chimehubs',
    'Your account is active and your $10 welcome bonus is available.',
    'success',
    false,
    '/activity'
  );

  return jsonb_build_object('account', to_jsonb(_account), 'card', to_jsonb(_card));
end;
$$;

grant execute on function public.create_account(
  text, text, text, text, text, text, text, text, text, text, text, text
) to authenticated;

-- =========================
-- RLS
-- =========================

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.virtual_cards enable row level security;
alter table public.transactions enable row level security;
alter table public.activities enable row level security;
alter table public.notifications enable row level security;
alter table public.drafts enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;

-- Profiles

drop policy if exists "Profiles: read own" on public.profiles;
drop policy if exists "Profiles: update own" on public.profiles;
drop policy if exists profiles_select_own_or_admin on public.profiles;
drop policy if exists profiles_insert_own_or_admin on public.profiles;
drop policy if exists profiles_update_own_or_admin on public.profiles;

create policy profiles_select_own_or_admin
on public.profiles for select
using (auth.uid() = id or public.is_admin());

create policy profiles_insert_own_or_admin
on public.profiles for insert
with check (auth.uid() = id or public.is_admin());

create policy profiles_update_own_or_admin
on public.profiles for update
using (auth.uid() = id or public.is_admin())
with check (auth.uid() = id or public.is_admin());

-- Accounts

drop policy if exists "Accounts: read own" on public.accounts;
drop policy if exists "Accounts: insert own" on public.accounts;
drop policy if exists accounts_select_own_or_admin on public.accounts;
drop policy if exists accounts_insert_own_or_admin on public.accounts;
drop policy if exists accounts_update_admin on public.accounts;

create policy accounts_select_own_or_admin
on public.accounts for select
using (auth.uid() = user_id or public.is_admin());

create policy accounts_insert_own_or_admin
on public.accounts for insert
with check (auth.uid() = user_id or public.is_admin());

create policy accounts_update_admin
on public.accounts for update
using (public.is_admin())
with check (public.is_admin());

-- Virtual Cards

drop policy if exists "Cards: read own" on public.virtual_cards;
drop policy if exists "Cards: update own" on public.virtual_cards;
drop policy if exists virtual_cards_select_own_or_admin on public.virtual_cards;
drop policy if exists virtual_cards_insert_own_or_admin on public.virtual_cards;
drop policy if exists virtual_cards_update_own_or_admin on public.virtual_cards;

create policy virtual_cards_select_own_or_admin
on public.virtual_cards for select
using (auth.uid() = user_id or public.is_admin());

create policy virtual_cards_insert_own_or_admin
on public.virtual_cards for insert
with check (auth.uid() = user_id or public.is_admin());

create policy virtual_cards_update_own_or_admin
on public.virtual_cards for update
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

-- Transactions

drop policy if exists "Transactions: read own" on public.transactions;
drop policy if exists "Transactions: insert own" on public.transactions;
drop policy if exists transactions_select_own_or_admin on public.transactions;
drop policy if exists transactions_insert_own_or_admin on public.transactions;
drop policy if exists transactions_update_own_or_admin on public.transactions;

create policy transactions_select_own_or_admin
on public.transactions for select
using (auth.uid() = user_id or public.is_admin());

create policy transactions_insert_own_or_admin
on public.transactions for insert
with check (auth.uid() = user_id or public.is_admin());

create policy transactions_update_own_or_admin
on public.transactions for update
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

-- Activities

drop policy if exists "Activities: read own" on public.activities;
drop policy if exists "Activities: insert own" on public.activities;
drop policy if exists activities_select_own_or_admin on public.activities;
drop policy if exists activities_insert_own_or_admin on public.activities;

create policy activities_select_own_or_admin
on public.activities for select
using (auth.uid() = user_id or public.is_admin());

create policy activities_insert_own_or_admin
on public.activities for insert
with check (auth.uid() = user_id or public.is_admin());

-- Notifications

drop policy if exists "Notifications: read own" on public.notifications;
drop policy if exists "Notifications: update own" on public.notifications;
drop policy if exists "Notifications: insert own" on public.notifications;
drop policy if exists notifications_select_own_or_admin on public.notifications;
drop policy if exists notifications_insert_own_or_admin on public.notifications;
drop policy if exists notifications_update_own_or_admin on public.notifications;
drop policy if exists notifications_delete_own_or_admin on public.notifications;

create policy notifications_select_own_or_admin
on public.notifications for select
using (auth.uid() = user_id or public.is_admin());

create policy notifications_insert_own_or_admin
on public.notifications for insert
with check (auth.uid() = user_id or public.is_admin());

create policy notifications_update_own_or_admin
on public.notifications for update
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

create policy notifications_delete_own_or_admin
on public.notifications for delete
using (auth.uid() = user_id or public.is_admin());

-- Drafts

drop policy if exists "Drafts: read own" on public.drafts;
drop policy if exists "Drafts: upsert own" on public.drafts;
drop policy if exists "Drafts: update own" on public.drafts;
drop policy if exists "Drafts: delete own" on public.drafts;
drop policy if exists drafts_select_own_or_admin on public.drafts;
drop policy if exists drafts_insert_own_or_admin on public.drafts;
drop policy if exists drafts_update_own_or_admin on public.drafts;
drop policy if exists drafts_delete_own_or_admin on public.drafts;

create policy drafts_select_own_or_admin
on public.drafts for select
using (auth.uid() = user_id or public.is_admin());

create policy drafts_insert_own_or_admin
on public.drafts for insert
with check (auth.uid() = user_id or public.is_admin());

create policy drafts_update_own_or_admin
on public.drafts for update
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

create policy drafts_delete_own_or_admin
on public.drafts for delete
using (auth.uid() = user_id or public.is_admin());

-- Chat Threads

drop policy if exists "Threads: read own" on public.chat_threads;
drop policy if exists "Threads: insert own" on public.chat_threads;
drop policy if exists chat_threads_select_own_or_admin on public.chat_threads;
drop policy if exists chat_threads_insert_own_or_admin on public.chat_threads;
drop policy if exists chat_threads_update_own_or_admin on public.chat_threads;

create policy chat_threads_select_own_or_admin
on public.chat_threads for select
using (auth.uid() = user_id or public.is_admin());

create policy chat_threads_insert_own_or_admin
on public.chat_threads for insert
with check (auth.uid() = user_id or public.is_admin());

create policy chat_threads_update_own_or_admin
on public.chat_threads for update
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

-- Chat Messages

drop policy if exists "Messages: read own" on public.chat_messages;
drop policy if exists "Messages: insert own" on public.chat_messages;
drop policy if exists "Messages: update own" on public.chat_messages;
drop policy if exists chat_messages_select_own_or_admin on public.chat_messages;
drop policy if exists chat_messages_insert_user_or_admin on public.chat_messages;
drop policy if exists chat_messages_update_own_or_admin on public.chat_messages;
drop policy if exists chat_messages_delete_admin_only on public.chat_messages;

create policy chat_messages_select_own_or_admin
on public.chat_messages for select
using (auth.uid() = user_id or public.is_admin());

create policy chat_messages_insert_user_or_admin
on public.chat_messages for insert
with check (
  (
    sender_type = 'user'
    and auth.uid() = user_id
  )
  or (
    sender_type = 'admin'
    and public.is_admin()
  )
);

create policy chat_messages_update_own_or_admin
on public.chat_messages for update
using (public.is_admin() or (auth.uid() = user_id and sender_type = 'admin'))
with check (public.is_admin() or (auth.uid() = user_id and sender_type = 'admin'));

create policy chat_messages_delete_admin_only
on public.chat_messages for delete
using (public.is_admin());

-- =========================
-- Storage Buckets + Policies
-- =========================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', true)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('payment-evidence', 'payment-evidence', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Evidence: read own" on storage.objects;
drop policy if exists "Evidence: insert own" on storage.objects;
drop policy if exists "Evidence: update own" on storage.objects;
drop policy if exists "Evidence: delete own" on storage.objects;

drop policy if exists avatars_read_own_or_admin on storage.objects;
drop policy if exists avatars_insert_own_or_admin on storage.objects;
drop policy if exists avatars_update_own_or_admin on storage.objects;
drop policy if exists avatars_delete_own_or_admin on storage.objects;
drop policy if exists chat_attachments_read_own_or_admin on storage.objects;
drop policy if exists chat_attachments_insert_own_or_admin on storage.objects;
drop policy if exists chat_attachments_update_own_or_admin on storage.objects;
drop policy if exists chat_attachments_delete_own_or_admin on storage.objects;
drop policy if exists payment_evidence_read_own_or_admin on storage.objects;
drop policy if exists payment_evidence_insert_own_or_admin on storage.objects;
drop policy if exists payment_evidence_update_own_or_admin on storage.objects;
drop policy if exists payment_evidence_delete_own_or_admin on storage.objects;

create policy avatars_read_own_or_admin
on storage.objects for select
using (
  bucket_id = 'avatars'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

create policy avatars_insert_own_or_admin
on storage.objects for insert
with check (
  bucket_id = 'avatars'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

create policy avatars_update_own_or_admin
on storage.objects for update
using (
  bucket_id = 'avatars'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
)
with check (
  bucket_id = 'avatars'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

create policy avatars_delete_own_or_admin
on storage.objects for delete
using (
  bucket_id = 'avatars'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

create policy chat_attachments_read_own_or_admin
on storage.objects for select
using (
  bucket_id = 'chat-attachments'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

create policy chat_attachments_insert_own_or_admin
on storage.objects for insert
with check (
  bucket_id = 'chat-attachments'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

create policy chat_attachments_update_own_or_admin
on storage.objects for update
using (
  bucket_id = 'chat-attachments'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
)
with check (
  bucket_id = 'chat-attachments'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

create policy chat_attachments_delete_own_or_admin
on storage.objects for delete
using (
  bucket_id = 'chat-attachments'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

create policy payment_evidence_read_own_or_admin
on storage.objects for select
using (
  bucket_id = 'payment-evidence'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

create policy payment_evidence_insert_own_or_admin
on storage.objects for insert
with check (
  bucket_id = 'payment-evidence'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

create policy payment_evidence_update_own_or_admin
on storage.objects for update
using (
  bucket_id = 'payment-evidence'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
)
with check (
  bucket_id = 'payment-evidence'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

create policy payment_evidence_delete_own_or_admin
on storage.objects for delete
using (
  bucket_id = 'payment-evidence'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- =========================
-- Privileges
-- =========================

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Optional: include chat tables in realtime publication
-- (safe to rerun)
do $$
begin
  begin
    alter publication supabase_realtime add table public.profiles;
  exception when duplicate_object then
    null;
  end;

  begin
    alter publication supabase_realtime add table public.chat_threads;
  exception when duplicate_object then
    null;
  end;

  begin
    alter publication supabase_realtime add table public.chat_messages;
  exception when duplicate_object then
    null;
  end;
end;
$$;



