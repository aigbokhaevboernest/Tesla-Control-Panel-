import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing auth" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const { user_id, action, amount } = await req.json();
    if (!user_id || typeof amount !== "number") return json({ error: "Invalid input" }, 400);

    if (action === "set") {
      const { error } = await admin.from("profiles").update({ balance: amount }).eq("id", user_id);
      if (error) return json({ error: error.message }, 500);
    } else if (action === "increment") {
      const { error } = await admin.rpc("increment_balance", { user_id, amount });
      if (error) return json({ error: error.message }, 500);
    } else if (action === "decrement") {
      const { error } = await admin.rpc("decrement_balance", { user_id, amount });
      if (error) return json({ error: error.message }, 500);
    } else {
      return json({ error: "Invalid action" }, 400);
    }
    return json({ success: true }, 200);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function json(b: unknown, status: number) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
