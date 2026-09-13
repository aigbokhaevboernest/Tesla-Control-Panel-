import { useEffect, useState } from "react";
import { supabase as supabaseTyped } from "@/lib/supabaseClient";
const supabase: any = supabaseTyped;
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function CybercabSettingsPage() {
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from("cybercab_settings").select("unit_price_usd").eq("id", 1).maybeSingle();
    if (data) setPrice(String(data.unit_price_usd));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    const value = Number(price);
    if (!value || value <= 0) return toast.error("Enter a valid price");
    setSaving(true);
    const { error } = await supabase.from("cybercab_settings").update({ unit_price_usd: value, updated_at: new Date().toISOString() }).eq("id", 1);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Unit price updated");
  };

  return (
    <div className="w-full max-w-md mx-auto px-3 py-4 space-y-4">
      <h1 className="text-xl font-bold">Cybercab Settings</h1>
      <Card>
        <CardContent className="p-4 space-y-3">
          <div>
            <Label>Unit price (USD)</Label>
            <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} disabled={loading} />
          </div>
          <Button onClick={save} disabled={saving || loading} className="w-full">
            {saving ? "Saving..." : "Save"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
