import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Supabase client — null when env vars are missing (e.g. Coolify deploy
 * without VITE_SUPABASE_* set). The app falls back to Telegram-only +
 * guest browse mode.
 */
export const supabase: SupabaseClient | null =
	supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;
