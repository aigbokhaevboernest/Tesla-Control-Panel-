import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "../components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function PlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", roi_percent: 0, duration_days: 0, min_deposit: 0, max_deposit: 0 });

  const load = async () => {
    const { data, error } = await supabase.from("investment_plans").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setPlans(data ?? []);
  };

  useEffect(() => { document.title = "Admin · Plans"; load(); }, []);

  const toggleActive = async (p: any) => {
    const { error } = await supabase.from("investment_plans").update({ is_active: !p.is_active }).eq("id", p.id);
    if (error) return toast.error(error.message);
    load();
  };

  const create = async () => {
    if (!form.name) return toast.error("Name required");
    const { error } = await supabase.from("investment_plans").insert(form);
    if (error) return toast.error(error.message);
    toast.success("Plan created");
    setOpen(false);
    setForm({ name: "", roi_percent: 0, duration_days: 0, min_deposit: 0, max_deposit: 0 });
    load();
  };

  const remove = async (p: any) => {
    if (!confirm(`Delete ${p.name}?`)) return;
    const { error } = await supabase.from("investment_plans").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Investment Plans</h1>
          <p className="text-sm text-muted-foreground">{plans.length} plans</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add New Plan</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Investment Plan</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>ROI %</Label><Input type="number" value={form.roi_percent} onChange={(e) => setForm({ ...form, roi_percent: Number(e.target.value) })} /></div>
                <div><Label>Duration (days)</Label><Input type="number" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })} /></div>
                <div><Label>Min Deposit</Label><Input type="number" value={form.min_deposit} onChange={(e) => setForm({ ...form, min_deposit: Number(e.target.value) })} /></div>
                <div><Label>Max Deposit</Label><Input type="number" value={form.max_deposit} onChange={(e) => setForm({ ...form, max_deposit: Number(e.target.value) })} /></div>
              </div>
            </div>
            <DialogFooter><Button onClick={create}>Create Plan</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((p) => (
          <Card key={p.id}>
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div>
                <CardTitle className="text-lg">{p.name}</CardTitle>
                <StatusBadge status={p.is_active ? "active" : "inactive"} />
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="ROI" value={`${p.roi_percent}%`} />
              <Row label="Duration" value={`${p.duration_days} days`} />
              <Row label="Min" value={`$${Number(p.min_deposit).toLocaleString()}`} />
              <Row label="Max" value={`$${Number(p.max_deposit).toLocaleString()}`} />
              <div className="flex items-center justify-between pt-2">
                <Label className="text-xs">Active</Label>
                <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p)} />
              </div>
            </CardContent>
          </Card>
        ))}
        {plans.length === 0 && <p className="text-sm text-muted-foreground">No plans yet</p>}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div>;
}
