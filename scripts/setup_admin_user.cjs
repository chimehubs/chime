/**
 * Creates or updates the admin auth user, then promotes profile role to admin.
 *
 * Usage (PowerShell):
 *   $env:SUPABASE_URL="https://your-project-ref.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
 *   node scripts/setup_admin_user.cjs
 *
 * Optional:
 *   $env:ADMIN_EMAIL="adminchime@gmail.com"
 *   $env:ADMIN_PASSWORD="937388"
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'adminchime@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '937388';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function findUserByEmail(email) {
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data?.users || [];
    const user = users.find((item) => (item.email || '').toLowerCase() === email.toLowerCase());
    if (user) return user;

    if (users.length < perPage) return null;
    page += 1;
  }
}

async function upsertAdminProfile(userId) {
  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        email: ADMIN_EMAIL,
        name: 'Admin User',
        role: 'admin',
        status: 'ACTIVE',
      },
      { onConflict: 'id' }
    );

  if (error) throw error;
}

async function run() {
  const existingUser = await findUserByEmail(ADMIN_EMAIL);
  let userId = '';

  if (existingUser) {
    const { error } = await supabase.auth.admin.updateUserById(existingUser.id, {
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        ...(existingUser.user_metadata || {}),
        name: 'Admin User',
      },
      app_metadata: {
        ...(existingUser.app_metadata || {}),
        role: 'admin',
      },
    });

    if (error) throw error;

    userId = existingUser.id;
    console.log(`Updated auth user: ${ADMIN_EMAIL}`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { name: 'Admin User' },
      app_metadata: { role: 'admin' },
    });

    if (error) throw error;
    if (!data?.user?.id) throw new Error('Failed to create admin user.');

    userId = data.user.id;
    console.log(`Created auth user: ${ADMIN_EMAIL}`);
  }

  await upsertAdminProfile(userId);
  console.log('Admin profile upserted and promoted to admin role.');
}

run().catch((error) => {
  console.error('Failed to setup admin user:', error.message || error);
  process.exit(1);
});
