import { useEffect, useState } from “react”;
import { supabase } from “@/lib/supabaseClient”;
import { Card, CardContent } from “@/components/ui/card”;
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from “@/components/ui/table”;
import { Button } from “@/components/ui/button”;
import { Checkbox } from “@/components/ui/checkbox”;
import { StatusBadge } from “../components/StatusBadge”;
import { toast } from “sonner”;
import { notifyEmail } from “../lib/notifyEmail”;

export default function DepositsPage({ mode }: { mode: “pending” | “log” }) {
const [rows, setRows] = useState<any[]>([]);
const [loading, setLoading] = useState(true);
const [sendEmail, setSendEmail] = useState(true);

const load = async () => {
setLoading(true);
let q = supabase
.from(“transactions”)
.select(“user_id, amount, method, status, created_at, id, wallet_address, bank_details, cashapp_tag, paypal_email”)
.eq(“type”, “deposit”)
.order(“created_at”, { ascending: false });

```
if (mode === "pending") q = q.eq("status", "pending");

const { data, error } = await q;
if (error) toast.error(error.message);
setRows(data ?? []);
setLoading(false);
```

};

useEffect(() => {
document.title = mode === “pending” ? “Admin · Deposit Requests” : “Admin · Deposit Log”;
load();
}, [mode]);

const review = async (d: any, newStatus: string) => {
const { error } = await supabase
.from(“transactions”)
.update({ status: newStatus })
.eq(“id”, d.id);
if (error) return toast.error(error.message);

```
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
```

};

return (
<div className="space-y-4 p-2 sm:p-4">
<div>
<h1 className="text-xl sm:text-2xl font-semibold">
{mode === “pending” ? “Pending Deposits” : “Deposit Log”}
</h1>
<p className="text-sm text-muted-foreground">{rows.length} entries</p>
</div>

```
  <Card>
    <CardContent className="p-3 sm:p-4">
      {mode === "pending" && (
        <label className="mb-3 flex items-center gap-2 text-sm">
          <Checkbox checked={sendEmail} onCheckedChange={(v) => setSendEmail(v === true)} />
          Send email notification on approve / reject
        </label>
      )}

      {/* ── Mobile cards (hidden on sm+) ── */}
      <div className="flex flex-col gap-3 sm:hidden">
        {loading ? (
          <p className="text-center text-muted-foreground py-6">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">No deposit requests</p>
        ) : (
          rows.map((d) => (
            <div key={d.id} className="rounded-lg border p-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-base">${Number(d.amount).toLocaleString()}</span>
                <StatusBadge status={d.status} />
              </div>
              <div className="text-xs text-muted-foreground break-all">{d.user_id}</div>
              <div className="flex gap-4 text-xs">
                <span className="capitalize"><span className="text-muted-foreground">Method: </span>{d.method || "—"}</span>
                <span><span className="text-muted-foreground">Date: </span>{new Date(d.created_at).toLocaleDateString()}</span>
              </div>
              {(d.wallet_address || d.bank_details || d.cashapp_tag || d.paypal_email) && (
                <div className="text-xs text-muted-foreground break-all">
                  {d.wallet_address || d.bank_details || d.cashapp_tag || d.paypal_email}
                </div>
              )}
              {mode === "pending" && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" className="flex-1" onClick={() => review(d, "approved")}>Approve</Button>
                  <Button size="sm" variant="destructive" className="flex-1" onClick={() => review(d, "rejected")}>Reject</Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => review(d, "failed")}>Failed</Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => review(d, "canceled")}>Cancel</Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ── Desktop table (hidden below sm) ── */}
      <div className="hidden sm:block overflow-x-auto">
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
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No deposit requests</TableCell></TableRow>
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
      </div>

    </CardContent>
  </Card>
</div>
```

);
}
