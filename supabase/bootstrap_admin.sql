-- Bootstrap Admin + Validation Queries
-- Run AFTER schema.sql and after the target user has signed up.

-- 1) Promote an existing user to admin
update public.profiles
set role = 'admin', status = 'ACTIVE'
where email = 'adminchime@gmail.com';

-- 2) Confirm promoted admin users
select id, email, role, status, created_at
from public.profiles
where role = 'admin'
order by created_at desc;

-- 3) Check key tables exist and row counts
select 'profiles' as table_name, count(*) as rows from public.profiles
union all
select 'accounts' as table_name, count(*) as rows from public.accounts
union all
select 'virtual_cards' as table_name, count(*) as rows from public.virtual_cards
union all
select 'transactions' as table_name, count(*) as rows from public.transactions
union all
select 'chat_threads' as table_name, count(*) as rows from public.chat_threads
union all
select 'chat_messages' as table_name, count(*) as rows from public.chat_messages;

-- 4) Quick policy check helper (run as authenticated users in SQL editor role simulator)
-- select * from public.profiles;
-- select * from public.accounts;
-- select * from public.chat_messages;
