import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
      .select("user_id, amount, method, status, created_at, id, wallet_address, bank_details, cashapp_tag, paypal_email")
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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">
          {mode === "pending" ? "Pending Withdrawals" : "Withdrawal Log"}
        </h1>
        <p className="text-sm text-muted-foreground">{rows.length} entries</p>
      </div>
      <Card>
        <CardContent className="p-4">
          {mode === "pending" && (
            <label className="mb-3 flex items-center gap-2 text-sm">
              <Checkbox checked={sendEmail} onCheckedChange={(v) => setSendEmail(v === true)} />
              Send email notification on approve / reject
            </label>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                {mode === "pending" && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No withdrawal requests</TableCell></TableRow>
              ) : (
                rows.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="text-xs text-muted-foreground">{d.user_id}</TableCell>
                    <TableCell className="font-semibold">${Number(d.amount).toLocaleString()}</TableCell>
                    <TableCell className="text-sm capitalize">{d.method || "—"}</TableCell>
                    <TableCell className="text-xs">
                      {d.wallet_address || d.bank_details || d.cashapp_tag || d.paypal_email || "—"}
                    </TableCell>
                    <TableCell className="text-sm">{new Date(d.created_at).toLocaleString()}</TableCell>
                    <TableCell><StatusBadge status={d.status} /></TableCell>
                    {mode === "pending" && (
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" onClick={() => review(d, "approved")}>Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => review(d, "rejected")}>Reject</Button>
                        <Button size="sm" variant="outline" onClick={() => review(d, "failed")}>Failed</Button>
                        <Button size="sm" variant="outline" onClick={() => review(d, "canceled")}>Cancel</Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
