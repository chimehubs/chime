import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const BRAND_NAME = 'Chimehubs';
const BRAND_GREEN = '#22c55e';
const BRAND_RED = '#ef4444';
const CARD_BG = 'rgba(15, 23, 42, 0.74)';
const PAGE_BG = '#050816';
const DEFAULT_TIMEOUT_MS = 5000;

function json(statusCode, body, origin = '*') {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'Content-Type, x-webhook-secret',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeMetadata(metadata) {
  if (!metadata) return {};
  if (typeof metadata === 'object') return metadata;
  try {
    return JSON.parse(metadata);
  } catch {
    return {};
  }
}

function formatCurrency(amount, currency = 'USD') {
  const numericAmount = Number(amount || 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);
}

function formatDate(value) {
  if (!value) return 'Now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function maskAccountNumber(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return 'Not available';
  if (digits.length <= 4) return digits;
  return `${'*'.repeat(Math.max(digits.length - 4, 0))}${digits.slice(-4)}`;
}

function buildRow(label, value) {
  return `
    <tr>
      <td style="padding: 0 0 12px; color: rgba(226, 232, 240, 0.72); font-size: 13px; width: 42%; vertical-align: top;">
        ${escapeHtml(label)}
      </td>
      <td style="padding: 0 0 12px; color: #f8fafc; font-size: 13px; font-weight: 600; text-align: right; vertical-align: top;">
        ${escapeHtml(value)}
      </td>
    </tr>
  `;
}

function renderEmail({
  preheader,
  eyebrow,
  title,
  subtitle,
  accentColor,
  amount,
  amountLabel,
  rows,
  ctaLabel,
  ctaUrl,
}) {
  const rowMarkup = rows.map((row) => buildRow(row.label, row.value)).join('');
  const ctaMarkup =
    ctaLabel && ctaUrl
      ? `
        <div style="margin-top: 28px;">
          <a href="${escapeHtml(ctaUrl)}" style="display: inline-block; padding: 12px 20px; border-radius: 999px; background: ${accentColor}; color: #04110d; font-size: 14px; font-weight: 700; text-decoration: none;">
            ${escapeHtml(ctaLabel)}
          </a>
        </div>
      `
      : '';

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(title)}</title>
      </head>
      <body style="margin: 0; padding: 0; background: ${PAGE_BG}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
        <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">
          ${escapeHtml(preheader || subtitle || title)}
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: radial-gradient(circle at top, rgba(34, 197, 94, 0.10), transparent 32%), linear-gradient(180deg, #08101c 0%, ${PAGE_BG} 100%);">
          <tr>
            <td align="center" style="padding: 40px 16px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 640px;">
                <tr>
                  <td>
                    <div style="margin-bottom: 18px; color: rgba(248, 250, 252, 0.82); font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase;">
                      ${escapeHtml(BRAND_NAME)} Banking Alerts
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="background: ${CARD_BG}; border: 1px solid rgba(255, 255, 255, 0.10); border-radius: 28px; padding: 32px; box-shadow: 0 18px 60px rgba(0, 0, 0, 0.32);">
                    <div style="display: inline-block; padding: 8px 12px; border-radius: 999px; background: ${accentColor}20; border: 1px solid ${accentColor}55; color: ${accentColor}; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">
                      ${escapeHtml(eyebrow)}
                    </div>
                    <h1 style="margin: 20px 0 12px; color: #f8fafc; font-size: 28px; line-height: 1.2;">
                      ${escapeHtml(title)}
                    </h1>
                    <p style="margin: 0; color: rgba(226, 232, 240, 0.84); font-size: 15px; line-height: 1.7;">
                      ${escapeHtml(subtitle)}
                    </p>
                    ${
                      amount
                        ? `
                          <div style="margin-top: 24px; padding: 18px 20px; border-radius: 20px; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08);">
                            <div style="color: rgba(226, 232, 240, 0.70); font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px;">
                              ${escapeHtml(amountLabel || 'Amount')}
                            </div>
                            <div style="color: ${accentColor}; font-size: 30px; font-weight: 800; letter-spacing: -0.02em;">
                              ${escapeHtml(amount)}
                            </div>
                          </div>
                        `
                        : ''
                    }
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 28px;">
                      ${rowMarkup}
                    </table>
                    ${ctaMarkup}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 18px 8px 0; color: rgba(148, 163, 184, 0.82); font-size: 12px; line-height: 1.7;">
                    Security Tip: ${BRAND_NAME} will never ask for your PIN via email.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function renderTextVersion({ eyebrow, title, subtitle, rows, ctaUrl }) {
  const detailLines = rows.map((row) => `${row.label}: ${row.value}`).join('\n');
  return `${eyebrow}\n${title}\n\n${subtitle}\n\n${detailLines}${ctaUrl ? `\n\nOpen: ${ctaUrl}` : ''}\n\nSecurity Tip: ${BRAND_NAME} will never ask for your PIN via email.`;
}

function getSiteUrl() {
  const raw = process.env.SITE_URL || process.env.VITE_SITE_URL || '';
  return raw.replace(/\/$/, '');
}

function inferTransactionEvent(record, metadata) {
  const description = String(record?.description || '').toLowerCase();

  if (metadata?.source === 'onboarding' || description.includes('welcome bonus')) return 'onboarding_bonus';
  if (metadata?.feature === 'cashback') return 'cashback';
  if (metadata?.feature === 'savings') {
    if (metadata?.action === 'fund') return 'savings_deposit';
    if (metadata?.action === 'withdraw') return 'savings_withdrawal';
    if (metadata?.action === 'break') return 'savings_break';
  }
  if (metadata?.feature === 'pay_bills') return 'pay_bills';
  if (description.includes('withdrawal')) return 'withdrawal';
  if (description.includes('transfer')) return 'transfer';
  if (description.includes('credit from')) return 'admin_credit';
  if (description.includes('add money')) return 'add_money';
  return record?.type === 'credit' ? 'credit' : 'debit';
}

function shouldNotifyTransaction(payload) {
  if (payload.type === 'INSERT') return true;
  if (payload.type !== 'UPDATE') return false;
  const current = payload.record || {};
  const previous = payload.old_record || {};
  return (
    current.status !== previous.status ||
    current.description !== previous.description ||
    JSON.stringify(normalizeMetadata(current.metadata)) !== JSON.stringify(normalizeMetadata(previous.metadata))
  );
}

async function getUserEmail(adminClient, userId) {
  const { data, error } = await adminClient.auth.admin.getUserById(userId);
  if (error) throw new Error(error.message || 'Unable to resolve user email');
  return data?.user?.email || null;
}

async function fetchProfile(adminClient, userId) {
  const { data } = await adminClient.from('profiles').select('*').eq('id', userId).maybeSingle();
  return data || null;
}

async function fetchAccount(adminClient, accountId) {
  if (!accountId) return null;
  const { data } = await adminClient.from('accounts').select('*').eq('id', accountId).maybeSingle();
  return data || null;
}

async function fetchCard(adminClient, accountId) {
  if (!accountId) return null;
  const { data } = await adminClient
    .from('virtual_cards')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data || null;
}

async function buildTransactionAlert(adminClient, payload) {
  if (!shouldNotifyTransaction(payload)) return null;

  const tx = payload.record || {};
  const previousTx = payload.old_record || {};
  const metadata = normalizeMetadata(tx.metadata);
  const profile = await fetchProfile(adminClient, tx.user_id);
  const account = await fetchAccount(adminClient, tx.account_id);
  const email = await getUserEmail(adminClient, tx.user_id);
  if (!email) return null;

  const displayName = profile?.first_name || profile?.name || 'Customer';
  const event = inferTransactionEvent(tx, metadata);
  const siteUrl = getSiteUrl();
  const activityUrl = siteUrl ? `${siteUrl}/activity` : '';
  const formattedAmount = formatCurrency(tx.amount, tx.currency);

  const rows = [
    { label: 'Transaction ID', value: tx.id || 'Pending assignment' },
    { label: 'Status', value: String(tx.status || 'pending').toUpperCase() },
    { label: 'Description', value: tx.description || 'Banking activity' },
    { label: 'Posted On', value: formatDate(tx.updated_at || tx.created_at) },
  ];

  if (account?.account_number) {
    rows.push({ label: 'Account', value: maskAccountNumber(account.account_number) });
  }

  if (metadata?.sender_name || metadata?.sender_bank) {
    rows.push({
      label: 'Sender',
      value: [metadata.sender_name, metadata.sender_bank].filter(Boolean).join(' - '),
    });
  }

  const bankDetails = metadata?.bank_details || {};
  if (bankDetails.bank_name || metadata?.destination_bank || metadata?.payee_name) {
    rows.push({
      label: 'Destination',
      value:
        bankDetails.bank_name ||
        metadata.destination_bank ||
        metadata.payee_name ||
        'Destination account',
    });
  }

  if (bankDetails.account_number || metadata?.destination_account_mask || metadata?.account_number) {
    rows.push({
      label: 'Destination Account',
      value:
        metadata.destination_account_mask ||
        maskAccountNumber(bankDetails.account_number || metadata.account_number),
    });
  }

  if (metadata?.reference) {
    rows.push({ label: 'Reference', value: metadata.reference });
  }

  if (bankDetails.remark || metadata?.transfer_message || metadata?.note) {
    rows.push({
      label: 'Remark',
      value: bankDetails.remark || metadata.transfer_message || metadata.note,
    });
  }

  let eyebrow = 'Transaction Alert';
  let title = 'Banking activity update';
  let subtitle = `Hello ${displayName}, a new activity has been recorded on your ${BRAND_NAME} account.`;
  let accentColor = tx.type === 'credit' && tx.status !== 'failed' ? BRAND_GREEN : BRAND_RED;
  let subject = `${BRAND_NAME}: Account activity update`;

  if (event === 'onboarding_bonus' && tx.status === 'completed') {
    eyebrow = 'Welcome Bonus';
    title = 'Your sign-up bonus is now available';
    subtitle = `Hello ${displayName}, welcome to ${BRAND_NAME}. Your $10 sign-up bonus has been credited and is ready to use.`;
    accentColor = BRAND_GREEN;
    subject = `${BRAND_NAME}: Welcome bonus received`;
  } else if (tx.status === 'failed') {
    eyebrow = 'Transaction Declined';
    title = 'We could not complete this transaction';
    subtitle = `Hello ${displayName}, your ${event.replace(/_/g, ' ')} request was declined. Please review the transaction details and contact customer support if you need help.`;
    accentColor = BRAND_RED;
    subject = `${BRAND_NAME}: Transaction declined`;
  } else if (tx.status === 'pending') {
    eyebrow = 'Transaction Pending';
    title = 'Your transaction is currently pending';
    subtitle = `Hello ${displayName}, we received your ${event.replace(/_/g, ' ')} request. It is now pending review and we will notify you when the status changes.`;
    accentColor = tx.type === 'credit' ? BRAND_GREEN : BRAND_RED;
    subject = `${BRAND_NAME}: Transaction pending`;
  } else if (tx.type === 'credit') {
    eyebrow = event === 'cashback' ? 'Cashback Reward' : 'Credit Alert';
    title = 'Funds received successfully';
    subtitle =
      event === 'onboarding_bonus'
        ? `Hello ${displayName}, your onboarding reward has posted successfully.`
        : `Hello ${displayName}, your account was credited successfully.`;
    accentColor = BRAND_GREEN;
    subject = `${BRAND_NAME}: Credit alert`;
  } else if (event === 'withdrawal') {
    eyebrow = 'Withdrawal Successful';
    title = 'Withdrawal completed successfully';
    subtitle = `Hello ${displayName}, your withdrawal request has been completed successfully.`;
    accentColor = BRAND_RED;
    subject = `${BRAND_NAME}: Withdrawal completed`;
  } else {
    eyebrow = 'Debit Alert';
    title = 'Funds debited successfully';
    subtitle = `Hello ${displayName}, a debit transaction has been completed on your account.`;
    accentColor = BRAND_RED;
    subject = `${BRAND_NAME}: Debit alert`;
  }

  if (payload.type === 'UPDATE' && previousTx?.status === 'pending' && tx.status === 'completed') {
    subject = `${BRAND_NAME}: Transaction completed`;
    title = tx.type === 'credit' ? 'Pending credit completed' : 'Pending debit completed';
    subtitle = `Hello ${displayName}, your previously pending transaction is now complete.`;
  }

  return {
    email,
    subject,
    html: renderEmail({
      preheader: subtitle,
      eyebrow,
      title,
      subtitle,
      accentColor,
      amount: formattedAmount,
      amountLabel: 'Amount',
      rows,
      ctaLabel: activityUrl ? 'View Activity' : null,
      ctaUrl: activityUrl || null,
    }),
    text: renderTextVersion({
      eyebrow,
      title,
      subtitle,
      rows,
      ctaUrl: activityUrl || null,
    }),
  };
}

async function buildAccountCreatedAlert(adminClient, payload) {
  if (payload.type !== 'INSERT') return null;

  const account = payload.record || {};
  const profile = await fetchProfile(adminClient, account.user_id);
  const card = await fetchCard(adminClient, account.id);
  const email = await getUserEmail(adminClient, account.user_id);
  if (!email) return null;

  const displayName = profile?.first_name || profile?.name || 'Customer';
  const siteUrl = getSiteUrl();
  const dashboardUrl = siteUrl ? `${siteUrl}/dashboard` : '';
  const rows = [
    { label: 'Account Number', value: account.account_number || 'Pending assignment' },
    { label: 'Routing Number', value: account.routing_number || 'Pending assignment' },
    { label: 'Account Type', value: account.account_type || 'Checking' },
    { label: 'Currency', value: account.currency || 'USD' },
    { label: 'Status', value: account.status || 'ACTIVE' },
    { label: 'Created On', value: formatDate(account.created_at) },
  ];

  if (card?.card_number) {
    rows.push({ label: 'Virtual Card', value: `**** ${String(card.card_number).slice(-4)}` });
  }
  if (card?.expiry_date) {
    rows.push({ label: 'Card Expiry', value: card.expiry_date });
  }

  const subtitle = `Hello ${displayName}, your ${BRAND_NAME} account has been created successfully. Your account number and routing number are ready below.`;

  return {
    email,
    subject: `${BRAND_NAME}: Your new account is ready`,
    html: renderEmail({
      preheader: subtitle,
      eyebrow: 'Account Created',
      title: 'Your banking profile is now active',
      subtitle,
      accentColor: BRAND_GREEN,
      amount: null,
      rows,
      ctaLabel: dashboardUrl ? 'Open Dashboard' : null,
      ctaUrl: dashboardUrl || null,
    }),
    text: renderTextVersion({
      eyebrow: 'Account Created',
      title: 'Your banking profile is now active',
      subtitle,
      rows,
      ctaUrl: dashboardUrl || null,
    }),
  };
}

async function buildChatAlert(adminClient, payload) {
  if (payload.type !== 'INSERT') return null;

  const message = payload.record || {};
  if (message.sender_type !== 'admin') return null;

  const email = await getUserEmail(adminClient, message.user_id);
  if (!email) return null;
  const profile = await fetchProfile(adminClient, message.user_id);
  const displayName = profile?.first_name || profile?.name || 'Customer';
  const siteUrl = getSiteUrl();
  const chatUrl = siteUrl ? `${siteUrl}/chat` : '';
  const excerpt = String(message.message || '').trim().slice(0, 180) || 'Customer support has sent you a new message.';

  const rows = [
    { label: 'Thread ID', value: message.thread_id || 'Open chat' },
    { label: 'Received On', value: formatDate(message.created_at) },
    { label: 'Message Preview', value: excerpt },
  ];

  if (message.attachment_url) {
    rows.push({ label: 'Attachment', value: 'A file was included in this reply.' });
  }

  const subtitle = `Hello ${displayName}, Chimehubs Customer Support has replied to your conversation. Open chat to review the full message and continue the thread.`;

  return {
    email,
    subject: `${BRAND_NAME}: New customer support reply`,
    html: renderEmail({
      preheader: excerpt,
      eyebrow: 'Customer Support',
      title: 'You have a new support message',
      subtitle,
      accentColor: BRAND_GREEN,
      amount: null,
      rows,
      ctaLabel: chatUrl ? 'Open Chat' : null,
      ctaUrl: chatUrl || null,
    }),
    text: renderTextVersion({
      eyebrow: 'Customer Support',
      title: 'You have a new support message',
      subtitle,
      rows,
      ctaUrl: chatUrl || null,
    }),
  };
}

async function resolveEmailPayload(adminClient, payload) {
  if (payload?.table === 'transactions') {
    return buildTransactionAlert(adminClient, payload);
  }
  if (payload?.table === 'accounts') {
    return buildAccountCreatedAlert(adminClient, payload);
  }
  if (payload?.table === 'chat_messages') {
    return buildChatAlert(adminClient, payload);
  }
  return null;
}

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error('Missing GMAIL_USER or GMAIL_APP_PASSWORD.');
  }

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: { user, pass },
    connectionTimeout: DEFAULT_TIMEOUT_MS,
    greetingTimeout: DEFAULT_TIMEOUT_MS,
    socketTimeout: DEFAULT_TIMEOUT_MS,
  });
}

export async function handler(event) {
  const origin = event.headers.origin || '*';

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Headers': 'Content-Type, x-webhook-secret',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed.' }, origin);
  }

  const expectedSecret = process.env.NOTIFICATION_WEBHOOK_SECRET;
  const providedSecret = event.headers['x-webhook-secret'] || event.headers['X-Webhook-Secret'];
  if (expectedSecret && providedSecret !== expectedSecret) {
    return json(401, { error: 'Invalid webhook secret.' }, origin);
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid JSON payload.' }, origin);
  }

  if (!payload?.table || !payload?.type || !payload?.record) {
    return json(400, { error: 'Webhook payload is missing required fields.' }, origin);
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.' }, origin);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const mail = await resolveEmailPayload(adminClient, payload);
    if (!mail) {
      return json(202, { success: true, skipped: true, reason: 'No email required for this event.' }, origin);
    }

    const transporter = getTransporter();
    const fromAddress = process.env.MAIL_FROM || `${BRAND_NAME} Alerts <${process.env.GMAIL_USER}>`;
    const result = await transporter.sendMail({
      from: fromAddress,
      to: mail.email,
      replyTo: process.env.GMAIL_USER,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });

    return json(
      200,
      {
        success: true,
        table: payload.table,
        type: payload.type,
        email: mail.email,
        messageId: result.messageId,
      },
      origin,
    );
  } catch (error) {
    console.error('[send-banking-alert]', error);
    return json(
      500,
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process banking alert.',
      },
      origin,
    );
  }
}
