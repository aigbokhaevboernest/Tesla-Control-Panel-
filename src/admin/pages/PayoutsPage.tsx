import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "../components/StatusBadge";
import { toast } from "sonner";
import { notifyEmail } from "../lib/notifyEmail";

export default function WithdrawalsPage({ mode }: { mode: "pending" | "log" }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("transactions")
      .select("user_id, amount, method, status, created_at, id, wallet_address, bank_details, cashapp_tag, paypal_email, bank_name, account_number, routing_number, swift_code, iban")
      .eq("type", "withdrawal")
      .order("created_at", { ascending: false });

    if (mode === "pending") q = q.eq("status", "pending");

    const { data, error } = await q;
    if (error) toast.error(error.message);
    setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    document.title = mode === "pending" ? "Admin · Withdrawal Requests" : "Admin · Withdrawal Log";
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
            total_balance: Math.max(0, Number((p as any).total_balance || 0) - amt),
          } as any)
          .eq("user_id", d.user_id);
      }
      await notifyEmail({
        send: sendEmail,
        userId: d.user_id,
        email: d.email,
        intent: "withdrawal_approved",
        subject: "Your withdrawal has been approved",
        body: `Your withdrawal of $${Number(d.amount).toLocaleString()} has been approved and is being processed.`,
      });
    } else if (newStatus === "rejected") {
      await notifyEmail({
        send: sendEmail,
        userId: d.user_id,
        email: d.email,
        intent: "withdrawal_rejected",
        subject: "Your withdrawal was rejected",
        body: `Your withdrawal of $${Number(d.amount).toLocaleString()} was rejected.`,
      });
    }

    toast.success(`Marked ${newStatus}`);
    load();
  };

  const getDetails = (d: any) =>
    [
      d.bank_name,
      d.account_number,
      d.routing_number,
      d.iban,
      d.swift_code,
      d.wallet_address,
      d.cashapp_tag,
      d.paypal_email,
      d.bank_details,
    ].filter(Boolean).join(" · ") || "—";

  return (
    <div className="w-full max-w-lg mx-auto px-3 py-4 space-y-4">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">
          {mode === "pending" ? "Pending Withdrawals" : "Withdrawal Log"}
        </h1>
        <p className="text-sm text-muted-foreground">{rows.length} entries</p>
      </div>

      {/* Email toggle */}
      {mode === "pending" && (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={sendEmail}
            onCheckedChange={(v) => setSendEmail(v === true)}
          />
          Send email on approve / reject
        </label>
      )}

      {/* States */}
      {loading && (
        <p className="text-center text-muted-foreground py-10">Loading…</p>
      )}

      {!loading && rows.length === 0 && (
        <p className="text-center text-muted-foreground py-10">
          No withdrawal requests
        </p>
      )}

      {/* Cards */}
      {!loading && rows.length > 0 && (
        <div className="flex flex-col gap-3">
          {rows.map((d) => (
            <Card key={d.id} className="w-full shadow-sm">
              <CardContent className="p-4 space-y-3">

                {/* Amount + Status */}
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold">
                    ${Number(d.amount).toLocaleString()}
                  </span>
                  <StatusBadge status={d.status} />
                </div>

                {/* Info rows */}
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Method</span>
                    <span className="capitalize font-medium">
                      {d.method || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-medium">
                      {new Date(d.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time</span>
                    <span className="font-medium">
                      {new Date(d.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="rounded-md bg-muted px-3 py-2 text-xs break-all">
                  <span className="text-muted-foreground">Details: </span>
                  {getDetails(d)}
                </div>

                {/* User ID */}
                <div className="text-xs text-muted-foreground break-all">
                  <span className="font-medium text-foreground">User ID: </span>
                  {d.user_id}
                </div>

                {/* Action buttons */}
                {mode === "pending" && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => review(d, "approved")}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="w-full"
                      onClick={() => review(d, "rejected")}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => review(d, "failed")}
                    >
                      Failed
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => review(d, "canceled")}
                    >
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
