import { supabase, isSupabaseEnabled, logSupabaseError } from '../lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import type { JudgeIdentity, UserProfile } from '../types';

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  judge: JudgeIdentity | null;
  isLoading: boolean;
}

/**
 * Initiate Google OAuth Sign-In via Supabase Auth.
 * Uses dynamic window.location.origin for production-safe redirect.
 */
export const signInWithGoogle = async (): Promise<{ error: string | null }> => {
  if (!isSupabaseEnabled || !supabase) {
    return { error: 'Supabase authentication is not enabled.' };
  }

  try {
    const redirectTo = `${window.location.origin}/account`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      logSupabaseError('AuthService', 'signInWithGoogle', error);
      return { error: error.message };
    }

    return { error: null };
  } catch (err: any) {
    logSupabaseError('AuthService', 'signInWithGoogle', err);
    return { error: err?.message || 'Failed to initiate Google sign-in.' };
  }
};

/**
 * Retrieve user profile from public.profiles table.
 */
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  if (!isSupabaseEnabled || !supabase || !userId) return null;
  try {
    const { data, error } = await (supabase as any)
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      logSupabaseError('AuthService', 'getUserProfile', error);
      return null;
    }
    if (!data) return null;

    return {
      id: data.id,
      fullName: data.full_name,
      email: data.email,
      avatarUrl: data.avatar_url,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (err) {
    logSupabaseError('AuthService', 'getUserProfile', err);
    return null;
  }
};

/**
 * Idempotently ensure user profile exists in public.profiles.
 * Acts as a fail-safe if the database trigger did not run or metadata was delayed.
 */
export const ensureUserProfile = async (user: User): Promise<UserProfile | null> => {
  if (!isSupabaseEnabled || !supabase || !user) return null;

  try {
    const existing = await getUserProfile(user.id);
    if (existing) return existing;

    const metaName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      (user.email ? user.email.split('@')[0] : 'Spotlight User');

    const metaAvatar =
      user.user_metadata?.avatar_url ||
      user.user_metadata?.picture ||
      null;

    const { data, error } = await (supabase as any)
      .from('profiles')
      .upsert(
        {
          id: user.id,
          full_name: metaName,
          email: user.email || null,
          avatar_url: metaAvatar,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      .select('*')
      .maybeSingle();

    if (error) {
      logSupabaseError('AuthService', 'ensureUserProfile', error);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      fullName: data.full_name,
      email: data.email,
      avatarUrl: data.avatar_url,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (err) {
    logSupabaseError('AuthService', 'ensureUserProfile', err);
    return null;
  }
};

/**
 * Sign in with email and password via Supabase Auth (Admin/Judge legacy fallback).
 */
export const signInWithEmailPassword = async (
  email: string,
  pass: string
): Promise<{ user: User | null; session: Session | null; error: string | null }> => {
  if (!isSupabaseEnabled || !supabase) {
    return { user: null, session: null, error: 'Supabase is disabled.' };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: pass,
    });

    if (error) {
      logSupabaseError('AuthService', 'signInWithEmailPassword', error);
      return { user: null, session: null, error: error.message };
    }

    return { user: data.user, session: data.session, error: null };
  } catch (err: any) {
    logSupabaseError('AuthService', 'signInWithEmailPassword', err);
    return { user: null, session: null, error: err?.message || 'Authentication failed.' };
  }
};

/**
 * Sign out of current Supabase Auth session.
 */
export const signOutSession = async (): Promise<boolean> => {
  if (!isSupabaseEnabled || !supabase) return true;
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      logSupabaseError('AuthService', 'signOutSession', error);
      return false;
    }
    return true;
  } catch (err) {
    logSupabaseError('AuthService', 'signOutSession', err);
    return false;
  }
};

/**
 * Gets active Supabase session.
 */
export const getCurrentSession = async (): Promise<Session | null> => {
  if (!isSupabaseEnabled || !supabase) return null;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      logSupabaseError('AuthService', 'getCurrentSession', error);
      return null;
    }
    return data.session;
  } catch (err) {
    logSupabaseError('AuthService', 'getCurrentSession', err);
    return null;
  }
};

/**
 * Verify if the authenticated user is an active admin in admin_users table.
 * Uses maybeSingle to avoid 406 / PGRST116 error when 0 rows match.
 */
export const checkIsActiveAdmin = async (userId: string): Promise<boolean> => {
  if (!isSupabaseEnabled || !supabase || !userId) return false;
  try {
    const { data, error } = await (supabase as any)
      .from('admin_users')
      .select('is_active')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      logSupabaseError('AuthService', 'checkIsActiveAdmin', error);
      return false;
    }
    if (!data) return false;
    return (data as any).is_active === true;
  } catch (err) {
    logSupabaseError('AuthService', 'checkIsActiveAdmin', err);
    return false;
  }
};

/**
 * Verify if the authenticated user is an active judge in judges table.
 * If found, returns mapped JudgeIdentity.
 * Uses maybeSingle to avoid 406 / PGRST116 error when 0 rows match.
 */
export const checkIsActiveJudge = async (userId: string): Promise<JudgeIdentity | null> => {
  if (!isSupabaseEnabled || !supabase || !userId) return null;
  try {
    const { data, error } = await (supabase as any)
      .from('judges')
      .select('*')
      .eq('auth_user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      logSupabaseError('AuthService', 'checkIsActiveJudge', error);
      return null;
    }
    if (!data) return null;
    const payload = data as any;

    return {
      id: payload.id,
      name: payload.name,
      code: payload.judge_code,
      title: 'Official Judge Panelist',
      role: payload.is_anchor ? 'Anchor Judge & Tiebreaker' : 'Panel Judge',
    };
  } catch (err) {
    logSupabaseError('AuthService', 'checkIsActiveJudge', err);
    return null;
  }
};

/**
 * Subscribe to Supabase Auth state changes.
 */
export const subscribeToAuthChanges = (
  callback: (session: Session | null) => void
): (() => void) => {
  if (!isSupabaseEnabled || !supabase) {
    return () => {};
  }

  const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });

  return () => {
    authListener.subscription.unsubscribe();
  };
};

