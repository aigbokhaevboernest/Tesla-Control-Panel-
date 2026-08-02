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

  try {
    // This project's send-email edge function reads `email`, not `to` —
    // confirmed from its actual deployed code. (A `to`-based fix applied
    // earlier was wrong; that was based on a different project's edge
    // function contract. Reverted.)
    const { data, error } = await supabase.functions.invoke("send-email", {
      body: {
        email: opts.email,
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

    toast.success("Notification email sent");
  } catch (err: any) {
    const msg = err?.message ?? "Unknown error";
    toast.error(`Email failed to send: ${msg}`);
    if (logRow?.id) {
      await supabase.from("email_log").update({ status: "failed" }).eq("id", logRow.id);
    }
  }
}
