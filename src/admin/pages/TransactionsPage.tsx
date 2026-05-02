import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "../components/StatusBadge";
import { toast } from "sonner";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

type Tx = {
  id: string; user_id: string; amount: number; status: string; method?: string;
  created_at: string; type: "Deposit" | "Withdrawal"; profiles?: { full_name?: string; email?: string };
};

export default function TransactionsPage() {
  const [rows, setRows] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");

  const load = async () => {
    setLoading(true);
    const [{ data: deps }, { data: pays }] = await Promise.all([
      supabase.from("deposits").select("*, profiles(full_name, email)").order("created_at", { ascending: false }),
      supabase.from("payouts").select("*, profiles(full_name, email)").order("created_at", { ascending: false }),
    ]);
    const all: Tx[] = [
      ...((deps ?? []) as any[]).map((d) => ({ ...d, type: "Deposit" as const })),
      ...((pays ?? []) as any[]).map((p) => ({ ...p, type: "Withdrawal" as const })),
    ];
    all.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    setRows(all);
    setLoading(false);
  };

  useEffect(() => { document.title = "Admin · Transactions"; load(); }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (type !== "all" && r.type !== type) return false;
      return true;
    });
  }, [rows, status, type]);

  const review = async (tx: Tx, newStatus: string) => {
    const table = tx.type === "Deposit" ? "deposits" : "payouts";
    const { error } = await supabase.from(table).update({ status: newStatus }).eq("user_id", tx.id);
    if (error) return toast.error(error.message);
    if (tx.type === "Deposit" && newStatus === "approved") {
      await supabase.functions.invoke("admin-balance", {
        body: { user_id: tx.user_id, action: "increment", amount: Number(tx.amount) },
      });
    }
    if (tx.type === "Withdrawal" && newStatus === "paid") {
      await supabase.functions.invoke("admin-balance", {
        body: { user_id: tx.user_id, action: "decrement", amount: Number(tx.amount) },
      });
    }
    toast.success(`Marked ${newStatus}`);
    load();
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Transactions</h1>
        <p className="text-sm text-muted-foreground">{filtered.length} entries</p>
      </div>
      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex flex-wrap gap-2">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Deposit">Deposit</SelectItem>
                <SelectItem value="Withdrawal">Withdrawal</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No transactions</TableCell></TableRow>
              ) : filtered.map((tx) => (
                <TableRow key={`${tx.type}-${tx.id}`}>
                  <TableCell>
                    <p className="text-sm font-medium">{tx.profiles?.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{tx.profiles?.email}</p>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      {tx.type === "Deposit" ? <ArrowDownToLine className="h-3.5 w-3.5 text-success" /> : <ArrowUpFromLine className="h-3.5 w-3.5 text-warning" />}
                      {tx.type}
                    </span>
                  </TableCell>
                  <TableCell className="font-semibold">${Number(tx.amount).toLocaleString()}</TableCell>
                  <TableCell className="text-sm">{new Date(tx.created_at).toLocaleString()}</TableCell>
                  <TableCell><StatusBadge status={tx.status} /></TableCell>
                  <TableCell className="text-right space-x-1">
                    {tx.status === "pending" && (
                      <>
                        <Button size="sm" onClick={() => review(tx, tx.type === "Deposit" ? "approved" : "paid")}>Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => review(tx, "rejected")}>Reject</Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
