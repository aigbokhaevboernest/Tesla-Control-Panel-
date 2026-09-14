import { useEffect, useState } from "react";
import { supabase as supabaseTyped } from "@/lib/supabaseClient";
const supabase: any = supabaseTyped;
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "../components/StatusBadge";
import { toast } from "sonner";
import { notifyEmail } from "../lib/notifyEmail";
import { formatMoney } from "@/lib/currency";

type Row = any;

export default function DepositsPage({ mode }: { mode: "pending" | "log" }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("transactions")
      .select("id, user_id, amount_usd, method, status, created_at, wallet_address, bank_details, bank_name, account_number, routing_number, swift_code, cashapp_tag, paypal_email, bank_fields")
      .eq("type", "deposit")
      .order("created_at", { ascending: false });

    if (mode === "pending") q = q.eq("status", "pending");

    const { data, error } = await q;
    if (error) toast.error(error.message);

    const txs = (data ?? []) as Row[];
    const ids = Array.from(new Set(txs.map((t) => t.user_id).filter(Boolean)));
    let profiles: Record<string, any> = {};
    if (ids.length) {
      const { data: ps } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, total_balance, currency")
        .in("user_id", ids as any);
      (ps ?? []).forEach((p: any) => { profiles[p.user_id] = p; });
    }

    // Pull any Cybercab investment linked to these transactions, so admin
    // can see (and later sync) the Cybercab status alongside the deposit.
    const txIds = txs.map((t) => t.id);
    let cybercabByTxId: Record<string, any> = {};
    if (txIds.length) {
      const { data: cybs } = await supabase
        .from("cybercab_investments")
        .select("id, transaction_id, status")
        .in("transaction_id", txIds as any);
      (cybs ?? []).forEach((c: any) => { cybercabByTxId[c.transaction_id] = c; });
    }

    setRows(txs.map((t) => ({
      ...t,
      profile: profiles[t.user_id] || null,
      cybercab: cybercabByTxId[t.id] || null,
    })));
    setLoading(false);
  };

  useEffect(() => {
    document.title = mode === "pending" ? "Admin · Deposit Requests" : "Admin · Deposit Log";
    load();
  }, [mode]);

  const review = async (d: Row, newStatus: string) => {
    const { error } = await supabase
      .from("transactions")
      .update({ status: newStatus })
      .eq("id", d.id);
    if (error) return toast.error(error.message);

    if (newStatus === "approved") {
      const current = Number(d.profile?.total_balance || 0);
      const amt = Number(d.amount_usd);
      await supabase
        .from("profiles")
        .update({ total_balance: current + amt } as any)
        .eq("user_id", d.user_id);

      await notifyEmail({
        send: sendEmail,
        userId: d.user_id,
        email: d.profile?.email,
        intent: "deposit_approved",
        subject: "Your deposit has been approved",
        body: `Your deposit of ${formatMoney(amt, d.profile?.currency)} has been approved and credited to your account.`,
      });

      // If this deposit is linked to a Cybercab investment, activate it too
      // and send a separate Cybercab-specific confirmation.
      if (d.cybercab) {
        await supabase
          .from("cybercab_investments")
          .update({ status: "active", updated_at: new Date().toISOString() })
          .eq("id", d.cybercab.id);

        await notifyEmail({
          send: sendEmail,
          userId: d.user_id,
          email: d.profile?.email,
          intent: "cybercab_investment_approved",
          subject: "Your Cybercab investment is active",
          body: `Your Cybercab investment of ${formatMoney(amt, d.profile?.currency)} has been approved and is now active.`,
        });
      }
    } else if (newStatus === "rejected") {
      await notifyEmail({
        send: sendEmail,
        userId: d.user_id,
        email: d.profile?.email,
        intent: "deposit_rejected",
        subject: "Your deposit was rejected",
        body: `Your deposit of ${formatMoney(Number(d.amount_usd), d.profile?.currency)} was rejected.`,
      });

      if (d.cybercab) {
        await supabase
          .from("cybercab_investments")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("id", d.cybercab.id);

        await notifyEmail({
          send: sendEmail,
          userId: d.user_id,
          email: d.profile?.email,
          intent: "cybercab_investment_rejected",
          subject: "Update on your Cybercab investment",
          body: `Your Cybercab investment could not be approved. Please contact support.`,
        });
      }
    }

    toast.success(`Marked ${newStatus}`);
    load();
  };

  const getDetails = (d: Row) => {
    if (Array.isArray(d.bank_fields) && d.bank_fields.length) {
      return d.bank_fields.map((f: any) => `${f.label}: ${f.value}`).join(" · ");
    }
    return [d.bank_name, d.account_number, d.routing_number, d.swift_code, d.venmo_handle, d.wallet_address, d.cashapp_tag, d.paypal_email, d.bank_details]
      .filter(Boolean).join(" · ") || "—";
  };

  return (
    <div className="w-full max-w-lg mx-auto px-3 py-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold">{mode === "pending" ? "Pending Deposits" : "Deposit Log"}</h1>
        <p className="text-sm text-muted-foreground">{rows.length} entries</p>
      </div>

      {mode === "pending" && (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={sendEmail} onCheckedChange={(v) => setSendEmail(v === true)} />
          Send email on approve / reject
        </label>
      )}

      {loading && <p className="text-center text-muted-foreground py-10">Loading…</p>}
      {!loading && rows.length === 0 && (
        <p className="text-center text-muted-foreground py-10">No pending requests</p>
      )}

      {!loading && rows.length > 0 && (
        <div className="flex flex-col gap-3">
          {rows.map((d) => (
            <Card key={d.id} className="w-full shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold">{formatMoney(Number(d.amount_usd), d.profile?.currency)}</span>
                  <StatusBadge status={d.status} />
                </div>

                {d.cybercab && (
                  <div className="rounded-md bg-primary/10 border border-primary/20 px-3 py-2 text-xs flex items-center justify-between">
                    <span className="font-medium text-primary">Cybercab investment</span>
                    <span className="capitalize text-muted-foreground">{d.cybercab.status}</span>
                  </div>
                )}

                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium text-right break-all">{d.profile?.full_name || d.profile?.email || "—"}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium text-right break-all">{d.profile?.email || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Method</span>
                    <span className="capitalize font-medium">{d.method || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-medium">{new Date(d.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time</span>
                    <span className="font-medium">{new Date(d.created_at).toLocaleTimeString()}</span>
                  </div>
                </div>

                <div className="rounded-md bg-muted px-3 py-2 text-xs break-all">
                  <span className="text-muted-foreground">Details: </span>
                  {getDetails(d)}
                </div>

                {mode === "pending" && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button size="sm" className="w-full" onClick={() => review(d, "approved")}>Approve</Button>
                    <Button size="sm" variant="destructive" className="w-full" onClick={() => review(d, "rejected")}>Reject</Button>
                    <Button size="sm" variant="outline" className="w-full" onClick={() => review(d, "failed")}>Failed</Button>
                    <Button size="sm" variant="outline" className="w-full" onClick={() => review(d, "canceled")}>Cancel</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
