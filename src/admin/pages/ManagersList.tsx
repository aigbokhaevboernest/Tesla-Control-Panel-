import { useEffect, useState } from "react";
import { supabase as supabaseTyped } from "@/lib/supabaseClient";
const supabase: any = supabaseTyped;
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
    const { data, error } = await supabase.from("expert_traders").select("*").order("sort_order", { ascending: true });
    if (error) toast.error(error.message);
    setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => { document.title = "Admin · Expert Traders"; load(); }, []);

  const remove = async (m: any) => {
    if (!confirm(`Remove ${m.name}?`)) return;
    const { error } = await supabase.from("expert_traders").delete().eq("id", m.id);
    if (error) return toast.error(error.message);
    toast.success("Removed");
    load();
  };

  const save = async () => {
    if (!editing) return;
    const { error } = await supabase.from("expert_traders").update({
      name: editing.name,
      handle: editing.handle,
      avatar_url: editing.avatar_url,
      specialty: editing.specialty,
      win_rate: Number(editing.win_rate || 0),
      total_profit_usd: Number(editing.total_profit_usd || 0),
      followers: Number(editing.followers || 0),
      min_copy_amount: Number(editing.min_copy_amount || 0),
      is_active: editing.is_active,
      sort_order: Number(editing.sort_order || 0),
    } as any).eq("id", editing.id);
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
                <Avatar className="h-12 w-12 shrink-0 rounded-full overflow-hidden">
                  {m.avatar_url
                    ? <AvatarImage src={m.avatar_url} className="object-cover" />
                    : <AvatarFallback className="bg-fuchsia-500/10 text-fuchsia-500">
                        <Briefcase className="h-5 w-5" />
                      </AvatarFallback>}
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{m.name}</p>
                  <p className="truncate text-xs text-muted-foreground">@{m.handle}</p>
                  {m.specialty && <p className="truncate text-[11px] text-muted-foreground">{m.specialty}</p>}
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                    <Stat label="Win Rate" value={`${m.win_rate || 0}%`} accent="text-emerald-500" />
                    <Stat label="Followers" value={`${Number(m.followers || 0).toLocaleString()}`} accent="text-amber-500" />
                    <Stat label="Profit" value={`$${Number(m.total_profit_usd || 0).toLocaleString()}`} accent="text-sky-500" />
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
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Name</Label><Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
                <div><Label>Handle</Label><Input value={editing.handle ?? ""} onChange={(e) => setEditing({ ...editing, handle: e.target.value })} /></div>
              </div>
              <div><Label>Avatar URL</Label><Input value={editing.avatar_url ?? ""} onChange={(e) => setEditing({ ...editing, avatar_url: e.target.value })} /></div>
              <div><Label>Specialty</Label><Input value={editing.specialty ?? ""} onChange={(e) => setEditing({ ...editing, specialty: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Win Rate %</Label><Input type="number" value={editing.win_rate ?? 0} onChange={(e) => setEditing({ ...editing, win_rate: e.target.value })} /></div>
                <div><Label>Total Profit USD</Label><Input type="number" value={editing.total_profit_usd ?? 0} onChange={(e) => setEditing({ ...editing, total_profit_usd: e.target.value })} /></div>
                <div><Label>Followers</Label><Input type="number" value={editing.followers ?? 0} onChange={(e) => setEditing({ ...editing, followers: e.target.value })} /></div>
                <div><Label>Min Copy Amount</Label><Input type="number" value={editing.min_copy_amount ?? 0} onChange={(e) => setEditing({ ...editing, min_copy_amount: e.target.value })} /></div>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <Label>Active</Label>
                <Switch checked={!!editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
              </div>
              <div><Label>Sort Order</Label><Input type="number" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: e.target.value })} /></div>
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
