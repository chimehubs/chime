import { getClient } from './supabaseClient';
import { AuthError, Session, User } from '@supabase/supabase-js';

interface AuthResponse {
  user?: User;
  session?: Session;
  error?: AuthError;
}

// Sign up new user
export async function signUpWithSupabase(
  email: string,
  password: string,
  metadata?: Record<string, any>,
  emailRedirectTo?: string
): Promise<AuthResponse> {
  const client = getClient();
  if (!client) {
    return { error: new AuthError('Supabase client not initialized') };
  }

  try {
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: metadata || {},
        emailRedirectTo,
      }
    });

    if (error) return { error };
    return {
      user: data.user || undefined,
      session: data.session || undefined
    };
  } catch (err) {
    return { error: err as AuthError };
  }
}

// Sign in with email and password
export async function signInWithSupabase(
  email: string,
  password: string
): Promise<AuthResponse> {
  const client = getClient();
  if (!client) {
    return { error: new AuthError('Supabase client not initialized') };
  }

  try {
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    });

    if (error) return { error };
    return {
      user: data.user || undefined,
      session: data.session || undefined
    };
  } catch (err) {
    return { error: err as AuthError };
  }
}

// Sign out
export async function signOutFromSupabase() {
  const client = getClient();
  if (!client) return;

  try {
    await client.auth.signOut();
  } catch (err) {
    console.error('Sign out error:', err);
  }
}

// Get current session
export async function getCurrentSessionSupabase() {
  const client = getClient();
  if (!client) return null;

  try {
    const { data, error } = await client.auth.getSession();
    if (error) {
      console.error('Get session error:', error);
      return null;
    }
    return data.session;
  } catch (err) {
    console.error('Get session error:', err);
    return null;
  }
}

// Get current user
export async function getCurrentUserSupabase() {
  const client = getClient();
  if (!client) return null;

  try {
    const { data, error } = await client.auth.getUser();
    if (error) {
      console.error('Get user error:', error);
      return null;
    }
    return data.user;
  } catch (err) {
    console.error('Get user error:', err);
    return null;
  }
}

// Subscribe to auth changes
export function onAuthStateChangeSupabase(
  callback: (session: Session | null) => void
) {
  const client = getClient();
  if (!client) return () => {};

  const { data } = client.auth.onAuthStateChange((event, session) => {
    callback(session);
  });

  return () => {
    data?.subscription?.unsubscribe();
  };
}

// Update user profile
export async function updateUserProfileSupabase(
  updates: Record<string, any>
) {
  const client = getClient();
  if (!client) return { error: new AuthError('Supabase client not initialized') };

  try {
    const { data, error } = await client.auth.updateUser({
      data: updates
    });

    if (error) return { error };
    return { user: data.user };
  } catch (err) {
    return { error: err as AuthError };
  }
}

export async function updatePasswordSupabase(password: string) {
  const client = getClient();
  if (!client) return { error: new AuthError('Supabase client not initialized') };
  try {
    const { data, error } = await client.auth.updateUser({ password });
    if (error) return { error };
    return { user: data.user };
  } catch (err) {
    return { error: err as AuthError };
  }
}
