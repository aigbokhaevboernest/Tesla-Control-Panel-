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
    [d.wallet_address, d.bank_name, d.account_number, d.routing_number, d.iban, d.swift_code, d.cashapp_tag, d.paypal_email, d.bank_details]
      .filter(Boolean).join(" · ") || "—";

  return (
    <div className="space-y-4 p-3">
      <div>
        <h1 className="text-xl font-semibold">
          {mode === "pending" ? "Pending Withdrawals" : "Withdrawal Log"}
        </h1>
        <p className="text-sm text-muted-foreground">{rows.length} entries</p>
      </div>

      {mode === "pending" && (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={sendEmail} onCheckedChange={(v) => setSendEmail(v === true)} />
          Send email notification on approve / reject
        </label>
      )}

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 sm:hidden">
        {loading ? (
          <p className="text-center text-muted-foreground py-10">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">No withdrawal requests</p>
        ) : (
          rows.map((d) => (
            <Card key={d.id}>
              <CardContent className="p-4 space-y-3">

                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold">${Number(d.amount).toLocaleString()}</span>
                  <StatusBadge status={d.status} />
                </div>

                <div className="text-xs text-muted-foreground break-all">
                  <span className="font-medium text-foreground">User: </span>{d.user_id}
                </div>

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

                <div className="text-xs text-muted-foreground break-all">
                  <span className="font-medium text-foreground">Details: </span>
                  {getDetails(d)}
                </div>

                {mode === "pending" && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button size="sm" onClick={() => review(d, "approved")}>Approve</Button>
                    <Button size="sm" variant="destructive" onClick={() => review(d, "rejected")}>Reject</Button>
                    <Button size="sm" variant="outline" onClick={() => review(d, "failed")}>Failed</Button>
                    <Button size="sm" variant="outline" onClick={() => review(d, "canceled")}>Cancel</Button>
                  </div>
                )}

              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block">
        <Card>
          <CardContent className="p-4 overflow-x-auto">
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
                      <TableCell className="text-xs">{getDetails(d)}</TableCell>
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

    </div>
  );
}
