import { useEffect, useState } from "react";
import { supabase as supabaseTyped } from "@/lib/supabaseClient";
const supabase: any = supabaseTyped;
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/currency";

export default function CybercabInvestmentsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("cybercab_investments")
        .select("*, profiles!inner(full_name, email)")
        .order("created_at", { ascending: false });
      setRows(data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="w-full max-w-lg mx-auto px-3 py-4 space-y-4">
      <h1 className="text-xl font-bold">Cybercab Investments</h1>
      <p className="text-sm text-muted-foreground">{rows.length} total requests</p>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-6">Loading…</p>
      ) : rows.map((r) => (
        <Card key={r.id}>
          <CardContent className="p-4 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="font-medium">{r.profiles?.full_name || r.profiles?.email}</span>
              <span className="font-bold">{formatMoney(r.amount_usd)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground text-xs">
              <span>{new Date(r.created_at).toLocaleString()}</span>
              <span className="capitalize">{r.status}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
