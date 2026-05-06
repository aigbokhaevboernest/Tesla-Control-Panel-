import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "../components/StatusBadge";
import { toast } from "sonner";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { formatMoney } from "@/lib/currency";

type Tx = {
  id: string;
  user_id: string;
  amount_usd: number;
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
    // ✅ Fix 1 — use id not user_id to update transaction
    const { error } = await supabase
      .from("transactions")
      .update({ status: newStatus })
      .eq("id", tx.id);
    if (error) return toast.error(error.message);

    if (newStatus === "approved") {
      // ✅ Fix 2 — use user_id not id to fetch profile
      const { data: p } = await supabase
        .from("profiles")
        .select("total_balance, deposit")
        .eq("user_id", tx.user_id)
        .maybeSingle();

      if (p) {
        // ✅ Fix 3 — use amount_usd not amount
        const amt = Number(tx.amount_usd);
        if (tx.type === "deposit") {
          await supabase
            .from("profiles")
            .update({
              total_balance: Number((p as any).total_balance || 0) + amt,
              deposit: Number((p as any).deposit || 0) + amt,
            })
            // ✅ Fix 4 — use user_id not id
            .eq("user_id", tx.user_id);
        } else if (tx.type === "withdrawal") {
          await supabase
            .from("profiles")
            .update({
              total_balance: Math.max(0, Number((p as any).total_balance || 0) - amt),
            })
            .eq("user_id", tx.user_id);
        }
      }
    }

    toast.success(`Marked ${newStatus}`);
    load();
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-semibold">Transactions</h1>
        <p className="text-sm text-muted-foreground">{filtered.length} entries</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="deposit">Deposit</SelectItem>
            <SelectItem value="withdrawal">Withdrawal</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Mobile card layout */}
      {loading ? (
        <p className="text-center text-muted-foreground py-10">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">No transactions</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((tx) => (
            <Card key={tx.id}>
              <CardContent className="p-4 space-y-3">
                {/* Top row — user and amount */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {tx.profiles?.full_name || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {tx.profiles?.email || "—"}
                    </p>
                  </div>
                  <p className="text-sm font-bold shrink-0">
  {tx.profiles?.currency} {Number(tx.amount_usd).toLocaleString()}
</p>

                </div>

                {/* Middle row — type, method, date */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  <span className="inline-flex items-center gap-1 capitalize font-medium text-foreground">
                    {tx.type === "deposit"
                      ? <ArrowDownToLine className="h-3.5 w-3.5 text-emerald-500" />
                      : <ArrowUpFromLine className="h-3.5 w-3.5 text-yellow-500" />}
                    {tx.type}
                  </span>
                  {tx.method && <span>· {tx.method}</span>}
                  <span>· {new Date(tx.created_at).toLocaleString()}</span>
                </div>

                {/* Bottom row — status and actions */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <StatusBadge status={tx.status} />
                  {tx.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => review(tx, "approved")}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => review(tx, "rejected")}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
