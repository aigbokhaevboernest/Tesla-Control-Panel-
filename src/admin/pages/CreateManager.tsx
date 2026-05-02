import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function CreateManager() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "", email: "", password: "",
    specialty: "", performance_pct: "", min_investment: "",
    profit_generated: "", avatar_url: "",
  });
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!form.email || !form.password || !form.full_name) {
      return toast.error("Name, email and password are required");
    }
    setLoading(true);
    // 1) create auth user via edge function (uses managers table internally)
    const { error: authErr } = await supabase.functions.invoke("admin-create-user", {
      body: {
        full_name: form.full_name,
        email: form.email,
        role: "manager",
        password: form.password,
      },
    });
    if (authErr) { setLoading(false); return toast.error(authErr.message); }

    // 2) update the just-created managers row with trader fields
    const { error: updErr } = await supabase
      .from("managers")
      .update({
        specialty: form.specialty || null,
        performance_pct: Number(form.performance_pct || 0),
        min_investment: Number(form.min_investment || 0),
        profit_generated: Number(form.profit_generated || 0),
        avatar_url: form.avatar_url || null,
      })
      .eq("email", form.email);

    setLoading(false);
    if (updErr) return toast.error(updErr.message);
    toast.success("Expert trader created");
    navigate("/admin/managers");
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">Create Expert Trader</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">Add a manager / expert trader profile</p>
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Trader Details</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label>Full Name *</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>Password *</Label><Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Trading Specialty</Label><Input placeholder="e.g. Forex, Crypto, Stocks" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} /></div>
          <div><Label>Performance %</Label><Input type="number" inputMode="decimal" value={form.performance_pct} onChange={(e) => setForm({ ...form, performance_pct: e.target.value })} /></div>
          <div><Label>Minimum Investment ($)</Label><Input type="number" inputMode="decimal" value={form.min_investment} onChange={(e) => setForm({ ...form, min_investment: e.target.value })} /></div>
          <div><Label>Profit Generated ($)</Label><Input type="number" inputMode="decimal" value={form.profit_generated} onChange={(e) => setForm({ ...form, profit_generated: e.target.value })} /></div>
          <div><Label>Profile Image URL (optional)</Label><Input value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} /></div>
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
