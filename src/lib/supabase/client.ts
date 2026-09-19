/**
 * src/lib/supabase/client.ts
 *
 * Browser-side Supabase client for Spotlight (Vite SPA).
 *
 * Usage pattern in services:
 *   import { supabase, isSupabaseEnabled } from '@/lib/supabase/client';
 *   if (!isSupabaseEnabled || !supabase) { return mockFallback(); }
 *   const { data, error } = await supabase.from('acts').select('*');
 *
 * The client is null when Supabase credentials are absent, allowing the
 * application to continue running against local mock data with zero crashes.
 *
 * NOTE: This is a client-only module (browser bundle).
 * There is no SSR/server client because this project is a Vite SPA.
 * If the project is migrated to Next.js, add a server.ts alongside this file.
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import { SUPABASE_URL, SUPABASE_ANON_KEY, USE_SUPABASE } from './config';

/** True when Supabase credentials are present and VITE_USE_SUPABASE=true */
export const isSupabaseEnabled: boolean = USE_SUPABASE;

/**
 * Typed Supabase browser client.
 * Null when operating in mock/local mode — always guard before use:
 *   if (!supabase) return mockResult;
 */
export const supabase: SupabaseClient<Database> | null = USE_SUPABASE
  ? createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export type { Database };

/**
 * Validates if a string is a valid UUID format (8-4-4-4-12 hex).
 */
export const isUuid = (val: string | null | undefined): boolean => {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
};

/**
 * Standardized log function for production Supabase errors.
 * Formats service name, function name, error code, message, details, and hint.
 */
export const logSupabaseError = (
  serviceName: string,
  functionName: string,
  error: any
): void => {
  if (!error || !USE_SUPABASE) return;
  console.error(`[${serviceName}] Supabase Error in ${functionName}:`, {
    service: serviceName,
    function: functionName,
    code: error.code || error.status || 'UNKNOWN',
    message: error.message || String(error),
    details: error.details || null,
    hint: error.hint || null,
  });
};

