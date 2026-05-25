import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/**
 * Browser-side Supabase client.
 * Used in client components for auth, realtime, and storage operations.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Worker API base URL.
 */
export const WORKER_API_URL =
  process.env.NEXT_PUBLIC_WORKER_API_URL || "http://localhost:8000";
