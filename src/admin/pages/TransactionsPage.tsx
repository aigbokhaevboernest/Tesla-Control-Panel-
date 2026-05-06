import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "../components/StatusBadge";
import { toast } from "sonner";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { formatMoney } from "@/lib/currency";

type Tx = {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  method?: string;
  type: "deposit" | "withdrawal";
  created_at: string;
  profiles?: { full_name?: string; email?: string; currency?: string };
};

export default function TransactionsPage() {
  const [rows, setRows] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");

  const load = async () => {
    setLoading(true);
    const { data: txData, error } = await supabase
  .from("transactions")
  .select("*")
  .order("created_at", { ascending: false });

if (error) {
  toast.error(error.message);
  setLoading(false);
  return;
}

const userIds = [...new Set((txData ?? []).map((t: any) => t.user_id))];
let profileMap: Record<string, { full_name: string; email: string; currency: string }> = {};

if (userIds.length) {
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name, email, currency")
    .in("user_id", userIds);

  (profiles ?? []).forEach((p: any) => {
    profileMap[p.user_id] = {
      full_name: p.full_name,
      email: p.email,
      currency: p.currency,
    };
  });
}

const merged = (txData ?? []).map((t: any) => ({
  ...t,
  profiles: profileMap[t.user_id] ?? null,
}));

setRows(merged as Tx[]);
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
    const { error } = await supabase.from("transactions").update({ status: newStatus }).eq("user_id", tx.id);
    if (error) return toast.error(error.message);

    if (newStatus === "approved") {
      // Fetch current balances and update directly
      const { data: p } = await supabase
        .from("profiles")
        .select("total_balance, deposit")
        .eq("id", tx.user_id)
        .maybeSingle();
      if (p) {
        const amt = Number(tx.amount);
        if (tx.type === "deposit") {
          await supabase
            .from("profiles")
            .update({
              total_balance: Number((p as any).total_balance || 0) + amt,
              deposit: Number((p as any).deposit || 0) + amt,
            } as any)
            .eq("id", tx.user_id);
        } else if (tx.type === "withdrawal") {
          await supabase
            .from("profiles")
            .update({
              total_balance: Number((p as any).total_balance || 0) - amt,
            } as any)
            .eq("id", tx.user_id);
        }
      }
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
                <SelectItem value="deposit">Deposit</SelectItem>
                <SelectItem value="withdrawal">Withdrawal</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
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
                <TableRow key={tx.id}>
                  <TableCell>
                    <p className="text-sm font-medium">{tx.profiles?.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{tx.profiles?.email}</p>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-sm capitalize">
                      {tx.type === "deposit"
                        ? <ArrowDownToLine className="h-3.5 w-3.5 text-success" />
                        : <ArrowUpFromLine className="h-3.5 w-3.5 text-warning" />}
                      {tx.type}
                    </span>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatMoney(tx.amount, tx.profiles?.currency)}
                  </TableCell>
                  <TableCell className="text-sm">{new Date(tx.created_at).toLocaleString()}</TableCell>
                  <TableCell><StatusBadge status={tx.status} /></TableCell>
                  <TableCell className="text-right space-x-1">
                    {tx.status === "pending" && (
                      <>
                        <Button size="sm" onClick={() => review(tx, "approved")}>Approve</Button>
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
