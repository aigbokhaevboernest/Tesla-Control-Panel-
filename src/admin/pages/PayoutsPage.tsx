import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "../components/StatusBadge";
import { toast } from "sonner";
import { notifyEmail } from "../lib/notifyEmail";
import { formatMoney } from "@/lib/currency";

type Row = any;

export default function WithdrawalsPage({ mode }: { mode: "pending" | "log" }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("transactions")
      .select("id, user_id, amount, method, status, created_at, wallet_address, bank_details, bank_name, account_number, routing_number, swift_code, iban, cashapp_tag, paypal_email")
      .eq("type", "withdrawal")
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
        .select("id, full_name, email, total_balance, currency")
        .in("id", ids);
      (ps ?? []).forEach((p: any) => { profiles[p.id] = p; });
    }
    setRows(txs.map((t) => ({ ...t, profile: profiles[t.user_id] || null })));
    setLoading(false);
  };

  useEffect(() => {
    document.title = mode === "pending" ? "Admin · Withdrawal Requests" : "Admin · Withdrawal Log";
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
      const amt = Number(d.amount);
      await supabase
        .from("profiles")
        .update({ total_balance: Math.max(0, current - amt) } as any)
        .eq("id", d.user_id);

      await notifyEmail({
        send: sendEmail,
        userId: d.user_id,
        email: d.profile?.email,
        intent: "payout_approved",
        subject: "Your withdrawal has been approved",
        body: `Your withdrawal of ${formatMoney(amt, d.profile?.currency)} has been approved and is being processed.`,
      });
    } else if (newStatus === "rejected") {
      await notifyEmail({
        send: sendEmail,
        userId: d.user_id,
        email: d.profile?.email,
        intent: "payout_rejected",
        subject: "Your withdrawal was rejected",
        body: `Your withdrawal of ${formatMoney(Number(d.amount), d.profile?.currency)} was rejected.`,
      });
    }

    toast.success(`Marked ${newStatus}`);
    load();
  };

  const getDetails = (d: Row) =>
    [d.bank_name, d.account_number, d.routing_number, d.iban, d.swift_code, d.wallet_address, d.cashapp_tag, d.paypal_email, d.bank_details]
      .filter(Boolean).join(" · ") || "—";

  return (
    <div className="w-full max-w-lg mx-auto px-3 py-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold">{mode === "pending" ? "Pending Withdrawals" : "Withdrawal Log"}</h1>
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
                  <span className="text-xl font-bold">{formatMoney(Number(d.amount), d.profile?.currency)}</span>
                  <StatusBadge status={d.status} />
                </div>

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
