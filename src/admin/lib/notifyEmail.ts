// Email notification helper — now wired to the "send-email" edge function (Resend).
// Still logs to email_log when admin opts in via the "send email" tick.
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export type EmailIntent =
  | "deposit_approved"
  | "deposit_rejected"
  | "payout_approved"
  | "payout_rejected"
  | "balance_credited"
  | "profit_added"
  | "withdrawal_made"
  | "kyc_approved"
  | "kyc_rejected";

// No per-admin routing yet — every outbound user notification is also copied here.
const ADMIN_COPY_EMAIL = "jameshilterson@gmail.com";

export async function notifyEmail(opts: {
  send: boolean;
  userId: string;
  email: string | null | undefined;
  intent: EmailIntent;
  subject: string;
  body?: string;
}) {
  if (!opts.send || !opts.email) return;

  const { data: u } = await supabase.auth.getUser();

  const { data: logRow, error: logError } = await supabase
    .from("email_log")
    .insert({
      recipient_email: opts.email,
      recipient_user_id: opts.userId,
      subject: opts.subject,
      body: opts.body ?? "",
      email_type: opts.intent,
      status: "queued",
      sent_by: u.user?.id ?? null,
    })
    .select()
    .single();

  if (logError) {
    toast.error(`Failed to log email: ${logError.message}`);
  }

  // The live send-email edge function reads `to`, not `email` — this was
  // the actual reason these emails never sent. Look up a first name too so
  // the greeting isn't blank, same as the rest of the app.
  let firstName = "";
  const { data: prof } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", opts.userId)
    .maybeSingle();
  firstName = ((prof as any)?.full_name || "").trim().split(" ")[0] || "";

  try {
    const { data, error } = await supabase.functions.invoke("send-email", {
      body: {
        to: opts.email,
        first_name: firstName,
        subject: opts.subject,
        message: opts.body ?? opts.subject,
      },
    });

    if (error || data?.ok === false) {
      const msg = error?.message ?? data?.error ?? "Unknown error";
      toast.error(`Email failed to send: ${msg}`);
      if (logRow?.id) {
        await supabase.from("email_log").update({ status: "failed" }).eq("id", logRow.id);
      }
      return;
    }

    if (logRow?.id) {
      await supabase.from("email_log").update({ status: "sent" }).eq("id", logRow.id);
    }

    // Best-effort admin copy — failures here don't block or surface to the reviewer.
    supabase.functions
      .invoke("send-email", {
        body: {
          to: ADMIN_COPY_EMAIL,
          first_name: "Admin",
          subject: `[Copy] ${opts.subject}`,
          message: opts.body ?? opts.subject,
        },
      })
      .catch(() => {});

    toast.success("Notification email sent");
  } catch (err: any) {
    const msg = err?.message ?? "Unknown error";
    toast.error(`Email failed to send: ${msg}`);
    if (logRow?.id) {
      await supabase.from("email_log").update({ status: "failed" }).eq("id", logRow.id);
    }
  }
}
