-- Transactional notification webhooks for Chimehubs
-- Run this file in the Supabase SQL editor.
--
-- Important:
--   Enable the pg_net extension first in Supabase Dashboard > Database > Extensions.
--
-- Usage:
--   1. Deploy the Netlify function at /api/send-banking-alert
--   2. Run this file in the SQL editor
--   3. Run:
--      select public.install_banking_notification_webhooks(
--        'https://your-netlify-site.netlify.app/api/send-banking-alert',
--        'your-shared-webhook-secret'
--      );
--
-- This keeps the current transactions.type and transactions.status values intact.
-- Event-specific email branching is handled inside the Netlify function via metadata and descriptions.

create or replace function public.queue_banking_notification_webhook()
returns trigger
language plpgsql
as $$
declare
  webhook_url text := tg_argv[0];
  webhook_secret text := nullif(tg_argv[1], '');
  headers jsonb := jsonb_build_object('Content-Type', 'application/json');
  payload jsonb;
begin
  if webhook_url is null or length(trim(webhook_url)) = 0 then
    raise exception 'Webhook URL is missing from trigger arguments.';
  end if;

  if webhook_secret is not null then
    headers := headers || jsonb_build_object('x-webhook-secret', webhook_secret);
  end if;

  payload := jsonb_build_object(
    'type', tg_op,
    'table', tg_table_name,
    'schema', tg_table_schema,
    'record',
      case
        when tg_op = 'DELETE' then null
        else to_jsonb(new)
      end,
    'old_record',
      case
        when tg_op = 'INSERT' then null
        else to_jsonb(old)
      end
  );

  perform net.http_post(
    url := webhook_url,
    headers := headers,
    body := payload,
    timeout_milliseconds := 5000
  );

  return coalesce(new, old);
end;
$$;

create or replace function public.remove_banking_notification_webhooks()
returns void
language plpgsql
as $$
begin
  drop trigger if exists trg_banking_alert_transactions_insert on public.transactions;
  drop trigger if exists trg_banking_alert_transactions_update on public.transactions;
  drop trigger if exists trg_banking_alert_accounts_insert on public.accounts;
  drop trigger if exists trg_banking_alert_chat_messages_insert on public.chat_messages;
end;
$$;

create or replace function public.install_banking_notification_webhooks(
  webhook_url text,
  webhook_secret text default null
)
returns void
language plpgsql
as $$
declare
  secret_arg text := coalesce(webhook_secret, '');
begin
  if webhook_url is null or length(trim(webhook_url)) = 0 then
    raise exception 'webhook_url is required';
  end if;

  if not exists (
    select 1
    from pg_extension
    where extname = 'pg_net'
  ) then
    raise exception 'pg_net extension is not enabled. Enable it first in Supabase Dashboard > Database > Extensions.';
  end if;

  perform public.remove_banking_notification_webhooks();

  execute format(
    'create trigger trg_banking_alert_transactions_insert
      after insert on public.transactions
      for each row
      execute function public.queue_banking_notification_webhook(%L, %L);',
    webhook_url,
    secret_arg
  );

  execute format(
    'create trigger trg_banking_alert_transactions_update
      after update of status, description, metadata, amount, type on public.transactions
      for each row
      execute function public.queue_banking_notification_webhook(%L, %L);',
    webhook_url,
    secret_arg
  );

  execute format(
    'create trigger trg_banking_alert_accounts_insert
      after insert on public.accounts
      for each row
      execute function public.queue_banking_notification_webhook(%L, %L);',
    webhook_url,
    secret_arg
  );

  execute format(
    'create trigger trg_banking_alert_chat_messages_insert
      after insert on public.chat_messages
      for each row
      when (new.sender_type = ''admin'')
      execute function public.queue_banking_notification_webhook(%L, %L);',
    webhook_url,
    secret_arg
  );
end;
$$;

comment on function public.queue_banking_notification_webhook()
is 'Queues a banking notification webhook through pg_net with trigger payload metadata.';

comment on function public.install_banking_notification_webhooks(text, text)
is 'Installs Netlify-backed banking alert webhooks for transactions, accounts, and admin chat replies.';

comment on function public.remove_banking_notification_webhooks()
is 'Removes Netlify-backed banking alert webhooks.';
