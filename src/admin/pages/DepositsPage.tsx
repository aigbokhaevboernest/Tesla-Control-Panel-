import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "../components/StatusBadge";
import { toast } from "sonner";
import { notifyEmail } from "../lib/notifyEmail";

export default function DepositsPage({ mode }: { mode: "pending" | "log" }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = async () => {
    setLoading(true);
    let q = supabase.from("deposits").select("*, profiles(full_name, email)").order("created_at", { ascending: false });
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

  useEffect(() => { document.title = mode === "pending" ? "Admin · Deposit Requests" : "Admin · Payment Log"; load(); }, [mode, status, from, to]);

  const review = async (d: any, newStatus: string) => {
    const { error } = await supabase.from("deposits").update({ status: newStatus }).eq("id", d.id);
    if (error) return toast.error(error.message);
    if (newStatus === "approved") {
      const { error: bErr } = await supabase.functions.invoke("admin-balance", {
        body: { user_id: d.user_id, action: "increment", amount: Number(d.amount) },
      });
      if (bErr) return toast.error(bErr.message);
    }
    toast.success(`Marked ${newStatus}`);
    load();
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{mode === "pending" ? "Pending Deposits" : "Payment Log"}</h1>
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
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
            </div>
          )}
          <Table>
            <TableHeader><TableRow>
              <TableHead>User</TableHead><TableHead>Amount</TableHead><TableHead>Method</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead>
              {mode === "pending" && <TableHead className="text-right">Actions</TableHead>}
            </TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
                : rows.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No entries</TableCell></TableRow>
                : rows.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <p className="text-sm font-medium">{d.profiles?.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{d.profiles?.email}</p>
                  </TableCell>
                  <TableCell className="font-semibold">${Number(d.amount).toLocaleString()}</TableCell>
                  <TableCell className="text-sm capitalize">{d.method || "—"}</TableCell>
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
