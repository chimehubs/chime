alter table public.profiles
  add column if not exists chat_last_seen_at timestamptz;

alter table public.chat_messages
  add column if not exists read_at timestamptz;

create index if not exists idx_profiles_chat_last_seen_at
  on public.profiles (chat_last_seen_at desc);

update public.chat_messages
set read_at = now()
where read = true
  and read_at is null;

do $$
begin
  begin
    alter publication supabase_realtime add table public.profiles;
  exception when duplicate_object then
    null;
  end;
end;
$$;
