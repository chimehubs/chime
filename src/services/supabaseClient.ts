import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

export function initSupabase() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key =
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url || !key) {
    if (import.meta.env.DEV) {
      console.error('Supabase client could not initialize. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.');
    }
    return null;
  }
  if (!supabase) supabase = createClient(url as string, key as string, { realtime: { params: { eventsPerSecond: 10 } } });
  return supabase;
}

export function getClient() {
  if (!supabase) return initSupabase();
  return supabase;
}

// Storage helpers
export async function uploadFileToStorage(bucket: string, path: string, file: File | Blob) {
  const client = getClient();
  if (!client) return null;
  try {
    const { data, error } = await client.storage.from(bucket).upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) {
      console.error('uploadFileToStorage error', error);
      return null;
    }
    const { data: publicData } = client.storage.from(bucket).getPublicUrl(data.path);
    return publicData?.publicUrl ?? null;
  } catch (e) {
    console.error('uploadFileToStorage exception', e);
    return null;
  }
}

export function getPublicUrl(bucket: string, path: string) {
  const client = getClient();
  if (!client) return null;
  const { data } = client.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl ?? null;
}

export default {
  initSupabase,
  getClient,
  uploadFileToStorage,
  getPublicUrl,
};
