// Hardcoded Supabase client to avoid env var issues on Vercel deployments.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const SUPABASE_URL = "https://vvohhdltxfengpcpbxyh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2b2hoZGx0eGZlbmdwY3BieHloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NTg4NDQsImV4cCI6MjA5MzEzNDg0NH0.I-_0INVANTg196qhXltkXnWglVeEBDbrHUzvxf2xD8I"

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
