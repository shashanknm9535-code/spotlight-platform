/**
 * src/lib/supabase/config.ts
 *
 * Centralised Supabase configuration reader.
 * Reads Vite environment variables and exposes them safely.
 * When vars are absent the client stays null and mock mode is used.
 */

/** Supabase project URL from VITE_SUPABASE_URL */
export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL ?? '';

/** Supabase anon (publishable) key from VITE_SUPABASE_ANON_KEY */
export const SUPABASE_ANON_KEY: string = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

/**
 * Master feature flag — read from VITE_USE_SUPABASE.
 * Defaults to false so the mock-only app continues to work without credentials.
 *
 * Set VITE_USE_SUPABASE=true in .env.local (never committed) to enable live queries.
 */
export const USE_SUPABASE: boolean =
  import.meta.env.VITE_USE_SUPABASE === 'true' &&
  SUPABASE_URL !== '' &&
  SUPABASE_ANON_KEY !== '';
