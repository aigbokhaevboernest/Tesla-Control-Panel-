// Email notification helper — currently STUBBED.
// Logs to email_log table when admin opts in via the "send email" tick.
// Wire to a real provider later (Lovable Emails / Resend) without changing call sites.
import { supabase } from "@/integrations/supabase/client";

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
  await supabase.from("email_log").insert({
    recipient_email: opts.email,
    recipient_user_id: opts.userId,
    subject: opts.subject,
    body: opts.body ?? "",
    email_type: opts.intent,
    status: "queued",
    sent_by: u.user?.id ?? null,
  });
}
