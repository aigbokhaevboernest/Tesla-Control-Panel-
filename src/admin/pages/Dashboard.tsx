import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, UserX, ArrowDownToLine, ArrowUpFromLine, DollarSign } from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";

type Stats = {
  total: number; active: number; blocked: number;
  pendingDepositsCount: number; pendingDepositsSum: number;
  pendingPayoutsCount: number; pendingPayoutsSum: number;
  approvedDepositsSum: number;
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentDeposits, setRecentDeposits] = useState<any[]>([]);
  const [recentPayouts, setRecentPayouts] = useState<any[]>([]);

  useEffect(() => {
    document.title = "Admin · Dashboard";
    const load = async () => {
      const [{ count: total }, { count: active }, { count: blocked }, deposits, payouts, approved, rd, rp] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "blocked"),
        supabase.from("deposits").select("amount", { count: "exact" }).eq("status", "pending"),
        supabase.from("payouts").select("amount", { count: "exact" }).eq("status", "pending"),
        supabase.from("deposits").select("amount").eq("status", "approved"),
        supabase.from("deposits").select("*, profiles(full_name, email)").order("created_at", { ascending: false }).limit(5),
        supabase.from("payouts").select("*, profiles(full_name, email)").order("created_at", { ascending: false }).limit(5),
      ]);
      const sum = (rows: any[] | null) => (rows ?? []).reduce((s, r) => s + Number(r.amount || 0), 0);
      setStats({
        total: total ?? 0, active: active ?? 0, blocked: blocked ?? 0,
        pendingDepositsCount: deposits.count ?? 0, pendingDepositsSum: sum(deposits.data),
        pendingPayoutsCount: payouts.count ?? 0, pendingPayoutsSum: sum(payouts.data),
        approvedDepositsSum: sum(approved.data),
      });
      setRecentDeposits(rd.data ?? []);
      setRecentPayouts(rp.data ?? []);
    };
    load();
  }, []);

  const cards = [
    { label: "Total Users", value: stats?.total ?? "—", icon: Users },
    { label: "Active Users", value: stats?.active ?? "—", icon: UserCheck },
    { label: "Blocked Users", value: stats?.blocked ?? "—", icon: UserX },
    { label: "Pending Deposits", value: `${stats?.pendingDepositsCount ?? 0} · $${(stats?.pendingDepositsSum ?? 0).toLocaleString()}`, icon: ArrowDownToLine },
    { label: "Pending Payouts", value: `${stats?.pendingPayoutsCount ?? 0} · $${(stats?.pendingPayoutsSum ?? 0).toLocaleString()}`, icon: ArrowUpFromLine },
    { label: "Total Approved Deposits", value: `$${(stats?.approvedDepositsSum ?? 0).toLocaleString()}`, icon: DollarSign },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of platform activity</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Recent Deposits</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recentDeposits.length === 0 && <p className="text-sm text-muted-foreground">No deposits yet</p>}
            {recentDeposits.map((d) => (
              <div key={d.id} className="flex items-center justify-between border-b border-border py-2 last:border-0">
                <div>
                  <p className="text-sm font-medium">{d.profiles?.full_name || d.profiles?.email || "—"}</p>
                  <p className="text-xs text-muted-foreground">{d.method || "—"} · {new Date(d.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">${Number(d.amount).toLocaleString()}</span>
                  <StatusBadge status={d.status} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recent Payouts</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recentPayouts.length === 0 && <p className="text-sm text-muted-foreground">No payouts yet</p>}
            {recentPayouts.map((d) => (
              <div key={d.id} className="flex items-center justify-between border-b border-border py-2 last:border-0">
                <div>
                  <p className="text-sm font-medium">{d.profiles?.full_name || d.profiles?.email || "—"}</p>
                  <p className="text-xs text-muted-foreground">{d.method || "—"} · {new Date(d.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">${Number(d.amount).toLocaleString()}</span>
                  <StatusBadge status={d.status} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
