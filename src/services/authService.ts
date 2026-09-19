/**
 * src/services/authService.ts
 *
 * Authentication service for Spotlight.
 * Handles Supabase Auth session management, admin authentication verification,
 * judge identity association, and role checks.
 */

import { supabase, isSupabaseEnabled } from '../lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import type { JudgeIdentity } from '../types';

export interface AuthState {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  judge: JudgeIdentity | null;
  isLoading: boolean;
}

/**
 * Sign in with email and password via Supabase Auth.
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
      return { user: null, session: null, error: error.message };
    }

    return { user: data.user, session: data.session, error: null };
  } catch (err: any) {
    return { user: null, session: null, error: err?.message || 'Authentication failed.' };
  }
};

/**
 * Sign out of current Supabase Auth session.
 */
export const signOutSession = async (): Promise<boolean> => {
  if (!isSupabaseEnabled || !supabase) return true;
  try {
    await supabase.auth.signOut();
    return true;
  } catch (err) {
    console.error('[AuthService] Error signing out:', err);
    return false;
  }
};

/**
 * Gets active Supabase session.
 */
export const getCurrentSession = async (): Promise<Session | null> => {
  if (!isSupabaseEnabled || !supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session;
  } catch (err) {
    console.error('[AuthService] Error getting session:', err);
    return null;
  }
};

/**
 * Verify if the authenticated user is an active admin in admin_users table.
 */
export const checkIsActiveAdmin = async (userId: string): Promise<boolean> => {
  if (!isSupabaseEnabled || !supabase || !userId) return false;
  try {
    const { data, error } = await (supabase as any)
      .from('admin_users')
      .select('is_active')
      .eq('id', userId)
      .single();

    if (error || !data) return false;
    return (data as any).is_active === true;
  } catch (err) {
    console.error('[AuthService] Error verifying active admin:', err);
    return false;
  }
};

/**
 * Verify if the authenticated user is an active judge in judges table.
 * If found, returns mapped JudgeIdentity.
 */
export const checkIsActiveJudge = async (userId: string): Promise<JudgeIdentity | null> => {
  if (!isSupabaseEnabled || !supabase || !userId) return null;
  try {
    const { data, error } = await (supabase as any)
      .from('judges')
      .select('*')
      .eq('auth_user_id', userId)
      .eq('is_active', true)
      .single();

    if (error || !data) return null;
    const payload = data as any;

    return {
      id: payload.id,
      name: payload.name,
      code: payload.judge_code,
      title: 'Official Judge Panelist',
      role: payload.is_anchor ? 'Anchor Judge & Tiebreaker' : 'Panel Judge',
    };
  } catch (err) {
    console.error('[AuthService] Error checking active judge:', err);
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
