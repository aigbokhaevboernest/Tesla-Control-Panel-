import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

type Codes = {
  id?: string;
  user_id: string;
  auth_code: string | null;
  cot_code: string | null;
  tax_code: string | null;
  auth_required: boolean;
  cot_required: boolean;
  tax_required: boolean;
};

const empty = (uid: string): Codes => ({
  user_id: uid,
  auth_code: null, cot_code: null, tax_code: null,
  auth_required: false, cot_required: false, tax_required: false,
});

const gen = () => Math.random().toString(36).slice(2, 10).toUpperCase();

export function AccountCodesCard({ userId }: { userId: string }) {
  const [c, setC] = useState<Codes | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from("account_codes").select("*").eq("user_id", userId).maybeSingle();
      if (error && error.code !== "PGRST116") toast.error(error.message);
      if (active) {
        setC((data as Codes) ?? empty(userId));
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [userId]);

  if (loading || !c) return null;

  const save = async () => {
    const payload = {
      user_id: userId,
      auth_code: c.auth_code, cot_code: c.cot_code, tax_code: c.tax_code,
      auth_required: c.auth_required, cot_required: c.cot_required, tax_required: c.tax_required,
    };
    const { error } = await supabase.from("account_codes").upsert(payload, { onConflict: "user_id" });
    if (error) return toast.error(error.message);
    toast.success("Codes saved");
  };

  return (
    <Card>
      <CardHeader><CardTitle>Account Codes (Withdrawal Gate)</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">Toggle which codes the user must enter to complete a withdrawal.</p>

        {(["auth", "cot", "tax"] as const).map((k) => {
          const label = k === "auth" ? "Authentication Code" : k === "cot" ? "COT (Cost of Transfer) Code" : "Tax Code";
          const codeKey = `${k}_code` as "auth_code" | "cot_code" | "tax_code";
          const reqKey = `${k}_required` as "auth_required" | "cot_required" | "tax_required";
          return (
            <div key={k} className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
              <div>
                <Label>{label}</Label>
                <Input
                  className="font-mono"
                  value={c[codeKey] ?? ""}
                  onChange={(e) => setC({ ...c, [codeKey]: e.target.value })}
                  placeholder="Not generated"
                />
              </div>
              <Button type="button" variant="outline" onClick={() => setC({ ...c, [codeKey]: gen() })}>
                <Sparkles className="mr-2 h-3.5 w-3.5" /> Generate
              </Button>
              <div className="flex items-center gap-2 pb-2">
                <Switch checked={c[reqKey]} onCheckedChange={(v) => setC({ ...c, [reqKey]: v })} />
                <Label className="text-xs">Required</Label>
              </div>
            </div>
          );
        })}

        <Button onClick={save}>Save Codes</Button>
      </CardContent>
    </Card>
  );
}
