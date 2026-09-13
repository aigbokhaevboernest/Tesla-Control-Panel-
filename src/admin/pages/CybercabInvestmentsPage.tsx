import { useEffect, useState } from "react";
import { supabase as supabaseTyped } from "@/lib/supabaseClient";
const supabase: any = supabaseTyped;
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { formatMoney } from "@/lib/currency";
import { notifyEmail } from "../lib/notifyEmail";

type Row = any;

export default function CybercabInvestmentsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "processing" | "active" | "failed">("all");

  const load = async () => {
    setLoading(true);
    const { data: invs, error } = await supabase
      .from("cybercab_investments")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);

    const list = (invs ?? []) as Row[];
    const ids = Array.from(new Set(list.map((r) => r.user_id).filter(Boolean)));
    let profiles: Record<string, any> = {};
    if (ids.length) {
      const { data: ps } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, currency")
        .in("user_id", ids);
      (ps ?? []).forEach((p: any) => { profiles[p.user_id] = p; });
    }
    setRows(list.map((r) => ({ ...r, profile: profiles[r.user_id] || null })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const setStatus = async (row: Row, newStatus: "active" | "failed") => {
    const { error } = await supabase
      .from("cybercab_investments")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) return toast.error(error.message);

    await notifyEmail({
      send: sendEmail,
      userId: row.user_id,
      email: row.profile?.email,
      intent: newStatus === "active" ? "cybercab_investment_approved" : "cybercab_investment_rejected",
      subject: newStatus === "active" ? "Your Cybercab investment is active" : "Update on your Cybercab investment",
      body: newStatus === "active"
        ? `Your Cybercab investment of ${formatMoney(row.amount_usd, row.profile?.currency)} has been approved and is now active.`
        : `Your Cybercab investment of ${formatMoney(row.amount_usd, row.profile?.currency)} could not be approved. Please contact support.`,
    });

    toast.success(`Marked ${newStatus}`);
    load();
  };

  const filtered = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  return (
    <div className="w-full max-w-lg mx-auto px-3 py-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold">Cybercab Investments</h1>
        <p className="text-sm text-muted-foreground">{filtered.length} entries</p>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {(["all", "pending", "processing", "active", "failed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
              filter === f ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={sendEmail} onCheckedChange={(v) => setSendEmail(v === true)} />
        Send email on approve / reject
      </label>

      {loading && <p className="text-center text-muted-foreground py-10">Loading…</p>}
      {!loading && filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-10">No entries</p>
      )}

      {!loading && filtered.map((r) => (
        <Card key={r.id} className="w-full shadow-sm">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">{formatMoney(Number(r.amount_usd), r.profile?.currency)}</span>
              <span className="text-xs px-2 py-1 rounded-full bg-muted capitalize">{r.status}</span>
            </div>
            <div className="text-sm space-y-0.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium text-right">{r.profile?.full_name || r.profile?.email || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium text-right break-all">{r.profile?.email || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Units</span>
                <span className="font-medium">{r.units}</span>
              </div>
            </div>

            {(r.status === "pending" || r.status === "processing") && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button size="sm" className="w-full" onClick={() => setStatus(r, "active")}>Approve</Button>
                <Button size="sm" variant="destructive" className="w-full" onClick={() => setStatus(r, "failed")}>Reject</Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
