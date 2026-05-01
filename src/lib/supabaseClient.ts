// Hardcoded Supabase client to avoid env var issues on Vercel deployments.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const SUPABASE_URL = "https://hfmcmbqftjtwrsrpmwzp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmbWNtYnFmdGp0d3JzcnBtd3pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NTU0MDIsImV4cCI6MjA5MzEzMTQwMn0.B1kU4g-qW_0xSSBCEKnJGybZ9PeXaff7rD6cdcSZRS4";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
