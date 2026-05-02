import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "../components/StatusBadge";
import { toast } from "sonner";
import { notifyEmail } from "../lib/notifyEmail";

export default function PayoutsPage({ mode }: { mode: "pending" | "log" }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sendEmail, setSendEmail] = useState(true);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("payouts").select("*, profiles(full_name, email, balance)").order("created_at", { ascending: false });
    if (mode === "pending") q = q.eq("status", "pending");
    else {
      if (status !== "all") q = q.eq("status", status);
      if (from) q = q.gte("created_at", from);
      if (to) q = q.lte("created_at", to + "T23:59:59");
    }
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => { document.title = mode === "pending" ? "Admin · Payout Requests" : "Admin · Payout Log"; load(); }, [mode, status, from, to]);

  const review = async (p: any, newStatus: string) => {
    const { error } = await supabase.from("payouts").update({ status: newStatus }).eq("user_id", p.id);
    if (error) return toast.error(error.message);
    if (newStatus === "paid") {
      const { error: bErr } = await supabase.functions.invoke("admin-balance", {
        body: { user_id: p.user_id, action: "decrement", amount: Number(p.amount) },
      });
      if (bErr) return toast.error(bErr.message);
      await notifyEmail({
        send: sendEmail, userId: p.user_id, email: p.profiles?.email,
        intent: "payout_approved",
        subject: "Your withdrawal was paid",
        body: `Your withdrawal of $${Number(p.amount).toLocaleString()} has been processed.`,
      });
    } else if (newStatus === "rejected") {
      await notifyEmail({
        send: sendEmail, userId: p.user_id, email: p.profiles?.email,
        intent: "payout_rejected",
        subject: "Your withdrawal was rejected",
        body: `Your withdrawal of $${Number(p.amount).toLocaleString()} was rejected.`,
      });
    }
    toast.success(`Marked ${newStatus}`);
    load();
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{mode === "pending" ? "Payout Requests" : "Payout Log"}</h1>
        <p className="text-sm text-muted-foreground">{rows.length} entries</p>
      </div>
      <Card>
        <CardContent className="p-4">
          {mode === "log" && (
            <div className="mb-4 flex flex-wrap gap-2">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
            </div>
          )}
          {mode === "pending" && (
            <label className="mb-3 flex items-center gap-2 text-sm">
              <Checkbox checked={sendEmail} onCheckedChange={(v) => setSendEmail(v === true)} />
              Send email notification on approve / reject
            </label>
          )}
          <Table>
            <TableHeader><TableRow>
              <TableHead>User</TableHead><TableHead>Amount</TableHead><TableHead>Method</TableHead><TableHead>Wallet</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead>
              {mode === "pending" && <TableHead className="text-right">Actions</TableHead>}
            </TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
                : rows.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No entries</TableCell></TableRow>
                : rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <p className="text-sm font-medium">{p.profiles?.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">Bal: ${Number(p.profiles?.balance || 0).toLocaleString()}</p>
                  </TableCell>
                  <TableCell className="font-semibold">${Number(p.amount).toLocaleString()}</TableCell>
                  <TableCell className="text-sm capitalize">{p.method || "—"}</TableCell>
                  <TableCell className="font-mono text-xs max-w-[180px] truncate">{p.wallet_address || "—"}</TableCell>
                  <TableCell className="text-sm">{new Date(p.created_at).toLocaleString()}</TableCell>
                  <TableCell><StatusBadge status={p.status} /></TableCell>
                  {mode === "pending" && (
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" onClick={() => review(p, "paid")}>Approve</Button>
                      <Button size="sm" variant="destructive" onClick={() => review(p, "rejected")}>Reject</Button>
                      <Button size="sm" variant="outline" onClick={() => review(p, "failed")}>Failed</Button>
                      <Button size="sm" variant="outline" onClick={() => review(p, "canceled")}>Cancel</Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
