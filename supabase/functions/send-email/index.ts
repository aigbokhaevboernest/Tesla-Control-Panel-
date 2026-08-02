import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, subject, message, first_name = "" } = await req.json();

    if (!email || !subject) {
      return new Response(JSON.stringify({ ok: false, error: "email and subject are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color:#f9f9f9;">
          <div style="background-color:#0A1428; padding:24px; text-align:center;">
            <span style="color:#ffffff; font-size:18px; font-weight:bold;">Tesla Equity</span>
          </div>
          <div style="background-color:#ffffff; padding:32px; max-width:600px; margin:0 auto;">
            <p style="font-size:16px; color:#111827;">${first_name ? `Hello ${first_name},` : ""}</p>
            <p style="font-size:15px; color:#374151; line-height:1.6;">
              ${message ? String(message).replace(/\n/g, "<br/>") : ""}
            </p>
          </div>
          <div style="background-color:#0A1428; padding:20px; text-align:center; font-size:13px; color:#6B7280;">
            This is an automated notification from the Tesla Equity .
          </div>
        </body>
      </html>
    `;

    // Verified domain sender — replaces Resend's sandbox address
    // (onboarding@resend.dev), which could only deliver to the Resend
    // account's own signup email. This address requires the domain
    // teslagrowthequity.com to be verified in the Resend dashboard
    // (Domains → the DNS records provided there) or sends will fail.
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Tesla Equity <support@teslagrowthequity.com>",
        to: email,
        subject,
        html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return new Response(JSON.stringify({ ok: false, error: data?.message ?? "Resend request failed" }), {
        status: res.status,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ ok: true, data }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
