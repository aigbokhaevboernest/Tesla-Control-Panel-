// src/lib/supabaseAdmin.ts
import { createClient } from '@supabase/supabase-js';

// For Vite, we need to be careful with environment variables
// The service role key should ONLY be used in server-side or admin contexts
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️ Supabase admin credentials not found. Admin features will be disabled.');
}

// This client bypasses RLS — USE ONLY IN ADMIN PAGES.
// Returns null instead of throwing if credentials are missing, so a missing
// env var disables admin features gracefully instead of crashing the entire app.
export const supabaseAdmin = (supabaseUrl && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;
