import { createClient } from '@supabase/supabase-js';

function json(statusCode, body, origin = '*') {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  return {
    statusCode,
    headers,
    body: JSON.stringify(body),
  };
}

export async function handler(event) {
  const origin = event.headers.origin || '*';

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed.' }, origin);
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return json(500, { error: 'Server-side Supabase environment variables are missing.' }, origin);
  }

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return json(401, { error: 'Missing admin session token.' }, origin);
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid request body.' }, origin);
  }

  const targetUserId = String(body?.userId || '').trim();
  if (!targetUserId) {
    return json(400, { error: 'A target user ID is required.' }, origin);
  }

  const requesterClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authHeader } },
  });

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user: requester },
    error: requesterError,
  } = await requesterClient.auth.getUser();

  if (requesterError || !requester) {
    return json(401, { error: 'Unable to verify admin session.' }, origin);
  }

  const { data: requesterProfile, error: requesterProfileError } = await adminClient
    .from('profiles')
    .select('id, role')
    .eq('id', requester.id)
    .single();

  if (requesterProfileError || requesterProfile?.role !== 'admin') {
    return json(403, { error: 'Only the admin account can delete users.' }, origin);
  }

  if (targetUserId === requester.id) {
    return json(400, { error: 'The admin account cannot delete itself.' }, origin);
  }

  const { data: targetProfile, error: targetProfileError } = await adminClient
    .from('profiles')
    .select('id, role, email, avatar_url')
    .eq('id', targetUserId)
    .single();

  if (targetProfileError || !targetProfile) {
    return json(404, { error: 'Target user was not found.' }, origin);
  }

  if (targetProfile.role === 'admin') {
    return json(400, { error: 'Admin accounts cannot be deleted from this tool.' }, origin);
  }

  const removableBuckets = ['avatars', 'chat-attachments', 'payment-evidence'];

  await Promise.all(
    removableBuckets.map(async (bucket) => {
      const { data: files } = await adminClient.storage.from(bucket).list(targetUserId, {
        limit: 100,
      });
      if (!files?.length) return;
      const paths = files.map((file) => `${targetUserId}/${file.name}`);
      await adminClient.storage.from(bucket).remove(paths);
    }),
  );

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetUserId);
  if (deleteError) {
    return json(500, { error: deleteError.message || 'Unable to delete user account.' }, origin);
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
    body: JSON.stringify({
    success: true,
    deletedUserId: targetUserId,
    deletedEmail: targetProfile.email || null,
    }),
  };
}
