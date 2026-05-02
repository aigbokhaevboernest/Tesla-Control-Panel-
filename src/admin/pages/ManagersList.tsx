import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Trash2, Pencil, Briefcase, TrendingUp } from "lucide-react";

export default function ManagersList() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("managers").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => { document.title = "Admin · Expert Traders"; load(); }, []);

  const remove = async (m: any) => {
    if (!confirm(`Remove ${m.full_name}?`)) return;
    if (m.user_id) await supabase.functions.invoke("admin-delete-user", { body: { user_id: m.user_id } });
    await supabase.from("managers").delete().eq("id", m.id);
    toast.success("Removed");
    load();
  };

  const save = async () => {
    if (!editing) return;
    const { error } = await supabase.from("managers").update({
      full_name: editing.full_name,
      specialty: editing.specialty || null,
      performance_pct: Number(editing.performance_pct || 0),
      min_investment: Number(editing.min_investment || 0),
      profit_generated: Number(editing.profit_generated || 0),
      avatar_url: editing.avatar_url || null,
    }).eq("id", editing.id);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    setEditing(null);
    load();
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">Expert Traders</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">{rows.length} total</p>
      </div>

      <div className="space-y-3">
        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No traders yet</p>
        ) : rows.map((m) => (
          <Card key={m.id}>
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12 shrink-0">
                  {m.avatar_url && <AvatarImage src={m.avatar_url} />}
                  <AvatarFallback className="bg-fuchsia-500/10 text-fuchsia-500">
                    <Briefcase className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{m.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                  {m.specialty && <p className="truncate text-[11px] text-muted-foreground">{m.specialty}</p>}
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                    <Stat label="Performance" value={`${m.performance_pct || 0}%`} accent="text-emerald-500" />
                    <Stat label="Min Invest" value={`$${Number(m.min_investment || 0).toLocaleString()}`} accent="text-amber-500" />
                    <Stat label="Profit" value={`$${Number(m.profit_generated || 0).toLocaleString()}`} accent="text-sky-500" />
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditing({ ...m })}>
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => remove(m)}>
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-500" /> Edit Trader</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Full Name</Label><Input value={editing.full_name ?? ""} onChange={(e) => setEditing({ ...editing, full_name: e.target.value })} /></div>
              <div><Label>Trading Specialty</Label><Input value={editing.specialty ?? ""} onChange={(e) => setEditing({ ...editing, specialty: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Performance %</Label><Input type="number" value={editing.performance_pct ?? 0} onChange={(e) => setEditing({ ...editing, performance_pct: e.target.value })} /></div>
                <div><Label>Min Investment</Label><Input type="number" value={editing.min_investment ?? 0} onChange={(e) => setEditing({ ...editing, min_investment: e.target.value })} /></div>
              </div>
              <div><Label>Profit Generated</Label><Input type="number" value={editing.profit_generated ?? 0} onChange={(e) => setEditing({ ...editing, profit_generated: e.target.value })} /></div>
              <div><Label>Profile Image URL</Label><Input value={editing.avatar_url ?? ""} onChange={(e) => setEditing({ ...editing, avatar_url: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-md border border-border p-1.5">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-xs font-semibold ${accent}`}>{value}</p>
    </div>
  );
}
