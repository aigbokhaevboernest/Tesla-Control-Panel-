import { useEffect, useState } from "react";
import { supabase as supabaseTyped } from "@/lib/supabaseClient";
const supabase: any = supabaseTyped;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, UserX, ArrowDownToLine, ArrowUpFromLine, DollarSign } from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";
import { formatMoney } from "@/lib/currency";

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
      const [
        { count: total },
        { count: active },
        { count: blocked },
        pendingDeposits,
        pendingPayouts,
        approvedDeposits,
        rd,
        rp,
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "blocked"),
        supabase.from("transactions").select("amount", { count: "exact" }).eq("type", "deposit").eq("status", "pending"),
        supabase.from("transactions").select("amount", { count: "exact" }).in("type", ["withdrawal", "payout"]).eq("status", "pending"),
        supabase.from("transactions").select("amount").eq("type", "deposit").eq("status", "approved"),
        supabase.from("transactions").select("*").eq("type", "deposit").order("created_at", { ascending: false }).limit(5),
        supabase.from("transactions").select("*").in("type", ["withdrawal", "payout"]).order("created_at", { ascending: false }).limit(5),
      ]);

      const sum = (rows: any[] | null) => (rows ?? []).reduce((s, r) => s + Number(r.amount || 0), 0);

      // Attach profile info to recent rows
      const ids = Array.from(new Set([...(rd.data ?? []), ...(rp.data ?? [])].map((t: any) => t.user_id).filter(Boolean)));
      let pmap: Record<string, any> = {};
      if (ids.length) {
        const { data: ps } = await supabase.from("profiles").select("user_id, full_name, email, currency").in("user_id", ids);
        (ps ?? []).forEach((p: any) => { pmap[p.user_id] = p; });
      }
      const enrich = (rows: any[]) => rows.map((r) => ({ ...r, profile: pmap[r.user_id] || null }));

      setStats({
        total: total ?? 0, active: active ?? 0, blocked: blocked ?? 0,
        pendingDepositsCount: pendingDeposits.count ?? 0, pendingDepositsSum: sum(pendingDeposits.data),
        pendingPayoutsCount: pendingPayouts.count ?? 0, pendingPayoutsSum: sum(pendingPayouts.data),
        approvedDepositsSum: sum(approvedDeposits.data),
      });
      setRecentDeposits(enrich(rd.data ?? []));
      setRecentPayouts(enrich(rp.data ?? []));
    };
    load();
  }, []);

  const cards = [
    { label: "Total Users", value: stats?.total ?? "—", icon: Users, color: "text-sky-500", bg: "bg-sky-500/10" },
    { label: "Active", value: stats?.active ?? "—", icon: UserCheck, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Blocked", value: stats?.blocked ?? "—", icon: UserX, color: "text-rose-500", bg: "bg-rose-500/10" },
    { label: "Pending Deposits", value: stats?.pendingDepositsCount ?? 0, sub: `${(stats?.pendingDepositsSum ?? 0).toLocaleString()}`, icon: ArrowDownToLine, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Pending Payouts", value: stats?.pendingPayoutsCount ?? 0, sub: `${(stats?.pendingPayoutsSum ?? 0).toLocaleString()}`, icon: ArrowUpFromLine, color: "text-violet-500", bg: "bg-violet-500/10" },
    { label: "Approved Deposits", value: `${(stats?.approvedDepositsSum ?? 0).toLocaleString()}`, icon: DollarSign, color: "text-teal-500", bg: "bg-teal-500/10" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">Dashboard</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">Platform overview</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label} className="overflow-hidden">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs">{c.label}</p>
                  <p className="mt-1 text-base font-semibold leading-tight sm:text-xl">{c.value}</p>
                  {c.sub && <p className="text-[10px] text-muted-foreground sm:text-xs">{c.sub}</p>}
                </div>
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${c.bg}`}>
                  <c.icon className={`h-4 w-4 ${c.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Recent Deposits</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recentDeposits.length === 0 && <p className="text-sm text-muted-foreground">No deposits yet</p>}
            {recentDeposits.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-2 border-b border-border py-2 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{d.profile?.full_name || d.profile?.email || "—"}</p>
                  <p className="truncate text-xs text-muted-foreground">{d.method || "—"} · {new Date(d.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-sm font-semibold">{formatMoney(d.amount, d.profile?.currency)}</span>
                  <StatusBadge status={d.status} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Recent Payouts</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recentPayouts.length === 0 && <p className="text-sm text-muted-foreground">No payouts yet</p>}
            {recentPayouts.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-2 border-b border-border py-2 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{d.profile?.full_name || d.profile?.email || "—"}</p>
                  <p className="truncate text-xs text-muted-foreground">{d.method || "—"} · {new Date(d.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-sm font-semibold">{formatMoney(d.amount, d.profile?.currency)}</span>
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
