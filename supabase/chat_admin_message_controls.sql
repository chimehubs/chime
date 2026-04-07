alter table public.chat_messages replica identity full;

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

drop policy if exists chat_messages_update_own_or_admin on public.chat_messages;
drop policy if exists chat_messages_delete_admin_only on public.chat_messages;

create policy chat_messages_update_own_or_admin
on public.chat_messages for update
using (public.is_admin() or (auth.uid() = user_id and sender_type = 'admin'))
with check (public.is_admin() or (auth.uid() = user_id and sender_type = 'admin'));

create policy chat_messages_delete_admin_only
on public.chat_messages for delete
using (public.is_admin());

do $$
begin
  begin
    alter publication supabase_realtime add table public.chat_messages;
  exception when duplicate_object then
    null;
  end;
end;
$$;
