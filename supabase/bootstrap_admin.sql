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

-- 5) One-time cleanup: remove legacy mock savings goals from existing profiles
-- Safe to rerun (idempotent). It only removes the old seeded demo goals.
with expanded as (
  select
    p.id,
    p.email,
    goal
  from public.profiles p
  left join lateral jsonb_array_elements(
    case
      when jsonb_typeof(coalesce(p.preferences->'savingsGoals', '[]'::jsonb)) = 'array'
        then coalesce(p.preferences->'savingsGoals', '[]'::jsonb)
      else '[]'::jsonb
    end
  ) as goal on true
),
cleaned as (
  select
    id,
    email,
    coalesce(
      jsonb_agg(goal) filter (
        where goal is not null
          and not (
            (goal->>'name' = 'Vacation' and goal->>'category' = 'Travel' and goal->>'target' = '5000' and goal->>'current' = '3200' and goal->>'deadline' = '2026-07-15')
            or
            (goal->>'name' = 'Emergency Fund' and goal->>'category' = 'Emergency' and goal->>'target' = '10000' and goal->>'current' = '7500' and goal->>'deadline' = '2026-12-31')
            or
            (goal->>'name' = 'New Car' and goal->>'category' = 'Vehicle' and goal->>'target' = '30000' and goal->>'current' = '8900' and goal->>'deadline' = '2027-06-30')
          )
      ),
      '[]'::jsonb
    ) as cleaned_goals
  from expanded
  group by id, email
),
updated as (
  update public.profiles p
  set
    preferences = jsonb_set(coalesce(p.preferences, '{}'::jsonb), '{savingsGoals}', c.cleaned_goals, true),
    updated_at = now()
  from cleaned c
  where p.id = c.id
    and coalesce(p.preferences->'savingsGoals', '[]'::jsonb) <> c.cleaned_goals
  returning p.id, p.email, jsonb_array_length(c.cleaned_goals) as remaining_goal_count
)
select id, email, remaining_goal_count
from updated
order by email;
