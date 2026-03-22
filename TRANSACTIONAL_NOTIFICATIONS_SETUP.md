# Transactional Notifications Setup

This setup keeps the current `transactions.type` (`credit` / `debit`) and `transactions.status` (`pending` / `completed` / `failed`) model intact so the dashboard balance logic does not break.

## What this implementation sends

- Account creation email on `accounts` insert
- Onboarding bonus email on `transactions` insert
- Credit and debit alerts on `transactions` insert
- Pending -> completed / failed status emails on `transactions` update
- Customer support reply emails on `chat_messages` insert when `sender_type = 'admin'`

## Files added

- [send-banking-alert.js](c:/Users/USER/chime/netlify/functions/send-banking-alert.js)
- [transactional_notification_webhooks.sql](c:/Users/USER/chime/supabase/transactional_notification_webhooks.sql)

## Netlify environment variables

Set these in Netlify Site Settings -> Environment Variables:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SITE_URL=https://your-site.netlify.app
GMAIL_USER=your-gmail-address@gmail.com
GMAIL_APP_PASSWORD=your-gmail-app-password
MAIL_FROM=Chimehubs Alerts <your-gmail-address@gmail.com>
NOTIFICATION_WEBHOOK_SECRET=replace-with-a-long-random-string
```

Notes:

- `SUPABASE_SERVICE_ROLE_KEY` must stay server-side only.
- `NOTIFICATION_WEBHOOK_SECRET` should match the value passed into the SQL installer function.
- Use a Gmail App Password, not your normal Gmail password.

## Supabase SQL setup

First, enable `pg_net` in Supabase Dashboard -> Database -> Extensions.

Then run [transactional_notification_webhooks.sql](c:/Users/USER/chime/supabase/transactional_notification_webhooks.sql), then execute:

```sql
select public.install_banking_notification_webhooks(
  'https://your-site.netlify.app/api/send-banking-alert',
  'replace-with-a-long-random-string'
);
```

If you need to remove the triggers later:

```sql
select public.remove_banking_notification_webhooks();
```

## Manual function test

You can test the Netlify function before enabling the webhooks.

Example payload for a failed transaction alert:

```json
{
  "type": "UPDATE",
  "table": "transactions",
  "schema": "public",
  "record": {
    "id": "6ec3c64d-7a47-4f8d-b631-4d88c8767d70",
    "user_id": "0d7f86ff-7e39-41f4-85e9-8dbecba8d19f",
    "account_id": "e0cf4d45-86b8-4fd5-bd7a-1bf9d51b6629",
    "amount": 250.0,
    "type": "debit",
    "status": "failed",
    "description": "Withdrawal to Chase Bank",
    "currency": "USD",
    "metadata": {
      "bank_details": {
        "account_name": "John Doe",
        "account_number": "021000021123456789",
        "bank_name": "Chase Bank",
        "remark": "Emergency transfer"
      },
      "requires_security_pin": true
    },
    "created_at": "2026-03-22T09:14:00Z",
    "updated_at": "2026-03-22T09:15:04Z"
  },
  "old_record": {
    "id": "6ec3c64d-7a47-4f8d-b631-4d88c8767d70",
    "user_id": "0d7f86ff-7e39-41f4-85e9-8dbecba8d19f",
    "account_id": "e0cf4d45-86b8-4fd5-bd7a-1bf9d51b6629",
    "amount": 250.0,
    "type": "debit",
    "status": "pending",
    "description": "Withdrawal to Chase Bank",
    "currency": "USD",
    "metadata": {
      "bank_details": {
        "account_name": "John Doe",
        "account_number": "021000021123456789",
        "bank_name": "Chase Bank",
        "remark": "Emergency transfer"
      },
      "requires_security_pin": true
    },
    "created_at": "2026-03-22T09:14:00Z",
    "updated_at": "2026-03-22T09:14:21Z"
  }
}
```

PowerShell test:

```powershell
$headers = @{
  "Content-Type" = "application/json"
  "x-webhook-secret" = "replace-with-a-long-random-string"
}

$body = Get-Content .\failed-transaction-payload.json -Raw

Invoke-RestMethod `
  -Method Post `
  -Uri "https://your-site.netlify.app/api/send-banking-alert" `
  -Headers $headers `
  -Body $body
```

## Behavior notes

- Account creation triggers two different emails:
  - `accounts` insert -> new account details
  - onboarding bonus `transactions` insert -> bonus alert
- Admin support replies trigger email alerts only when the new chat row has `sender_type = 'admin'`
- Transaction update emails are only sent when the status, description, metadata, amount, or type changes
