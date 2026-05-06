import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function CreateManager() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    handle: "",
    avatar_url: "",
    specialty: "",
    win_rate: "",
    total_profit_usd: "",
    followers: "",
    min_copy_amount: "",
    is_active: true,
    sort_order: "0",
  });
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const required = ["name", "handle", "avatar_url", "specialty", "win_rate", "total_profit_usd", "followers", "min_copy_amount"] as const;
    for (const k of required) {
      const v = (form as any)[k];
      if (v === "" || v == null) return toast.error(`${k.replace(/_/g, " ")} is required`);
    }

    setLoading(true);
    const { error } = await supabase.from("expert_traders").insert({
      name: form.name,
      handle: form.handle,
      avatar_url: form.avatar_url,
      specialty: form.specialty,
      win_rate: Number(form.win_rate),
      total_profit_usd: Number(form.total_profit_usd),
      followers: Number(form.followers),
      min_copy_amount: Number(form.min_copy_amount),
      is_active: form.is_active,
      sort_order: Number(form.sort_order || 0),
    } as any);

    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Expert trader created");
    navigate("/admin/managers");
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">Create Expert Trader</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">Add an expert trader profile</p>
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Trader Details</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Handle *</Label><Input value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Avatar URL *</Label><Input value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Specialty *</Label><Input placeholder="e.g. Forex, Crypto" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} /></div>
          <div><Label>Win Rate % *</Label><Input type="number" inputMode="decimal" value={form.win_rate} onChange={(e) => setForm({ ...form, win_rate: e.target.value })} /></div>
          <div><Label>Total Profit (USD) *</Label><Input type="number" inputMode="decimal" value={form.total_profit_usd} onChange={(e) => setForm({ ...form, total_profit_usd: e.target.value })} /></div>
          <div><Label>Followers *</Label><Input type="number" value={form.followers} onChange={(e) => setForm({ ...form, followers: e.target.value })} /></div>
          <div><Label>Min Copy Amount *</Label><Input type="number" inputMode="decimal" value={form.min_copy_amount} onChange={(e) => setForm({ ...form, min_copy_amount: e.target.value })} /></div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <Label>Active</Label>
            <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
          </div>
          <div><Label>Sort Order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} /></div>
          <div className="sm:col-span-2">
            <Button onClick={submit} disabled={loading} className="w-full sm:w-auto">
              {loading ? "Creating…" : "Create Trader"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
