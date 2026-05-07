import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "../components/StatusBadge";
import { toast } from "sonner";
import { notifyEmail } from "../lib/notifyEmail";

export default function DepositsPage({ mode }: { mode: "pending" | "log" }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("transactions")
      .select("user_id, amount, method, status, created_at, id, wallet_address, bank_details, cashapp_tag, paypal_email")
      .eq("type", "deposit")
      .order("created_at", { ascending: false });

    if (mode === "pending") q = q.eq("status", "pending");

    const { data, error } = await q;
    if (error) toast.error(error.message);
    setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    document.title = mode === "pending" ? "Admin · Deposit Requests" : "Admin · Deposit Log";
    load();
  }, [mode]);

  const review = async (d: any, newStatus: string) => {
    const { error } = await supabase
      .from("transactions")
      .update({ status: newStatus })
      .eq("id", d.id);
    if (error) return toast.error(error.message);

    if (newStatus === "approved") {
      const { data: p } = await supabase
        .from("profiles")
        .select("total_balance")
        .eq("user_id", d.user_id)
        .maybeSingle();
      if (p) {
        const amt = Number(d.amount);
        await supabase
          .from("profiles")
          .update({
            total_balance: Number((p as any).total_balance || 0) + amt,
          } as any)
          .eq("user_id", d.user_id);
      }
      await notifyEmail({
        send: sendEmail,
        userId: d.user_id,
        email: d.email,
        intent: "deposit_approved",
        subject: "Your deposit has been approved",
        body: `Your deposit of $${Number(d.amount).toLocaleString()} has been approved and credited to your account.`,
      });
    } else if (newStatus === "rejected") {
      await notifyEmail({
        send: sendEmail,
        userId: d.user_id,
        email: d.email,
        intent: "deposit_rejected",
        subject: "Your deposit was rejected",
        body: `Your deposit of $${Number(d.amount).toLocaleString()} was rejected.`,
      });
    }

    toast.success(`Marked ${newStatus}`);
    load();
  };

  return (
    <div className="space-y-4 p-3">

      <div>
        <h1 className="text-xl font-semibold">
          {mode === "pending" ? "Pending Deposits" : "Deposit Log"}
        </h1>
        <p className="text-sm text-muted-foreground">{rows.length} entries</p>
      </div>

      {mode === "pending" && (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={sendEmail} onCheckedChange={(v) => setSendEmail(v === true)} />
          Send email notification on approve / reject
        </label>
      )}

      {loading ? (
        <p className="text-center text-muted-foreground py-10">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">No deposit requests</p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((d) => (
            <Card key={d.id}>
              <CardContent className="p-4 space-y-3">

                {/* Top row: amount + status */}
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold">
                    ${Number(d.amount).toLocaleString()}
                  </span>
                  <StatusBadge status={d.status} />
                </div>

                {/* User ID */}
                <div className="text-xs text-muted-foreground break-all">
                  <span className="font-medium text-foreground">User: </span>
                  {d.user_id}
                </div>

                {/* Method + Date */}
                <div className="flex gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Method: </span>
                    <span className="capitalize">{d.method || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date: </span>
                    {new Date(d.created_at).toLocaleDateString()}
                  </div>
                </div>

                {/* Payment details */}
                {(d.wallet_address || d.bank_details || d.cashapp_tag || d.paypal_email) && (
                  <div className="text-xs text-muted-foreground break-all">
                    <span className="font-medium text-foreground">Details: </span>
                    {d.wallet_address || d.bank_details || d.cashapp_tag || d.paypal_email}
                  </div>
                )}

                {/* Action buttons */}
                {mode === "pending" && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button size="sm" onClick={() => review(d, "approved")}>
                      Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => review(d, "rejected")}>
                      Reject
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => review(d, "failed")}>
                      Failed
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => review(d, "canceled")}>
                      Cancel
                    </Button>
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
