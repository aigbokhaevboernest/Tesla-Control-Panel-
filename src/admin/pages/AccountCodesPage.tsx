import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Eye, ShieldAlert } from "lucide-react";

// Lightweight index — withdrawal-code editing now lives inside each user's detail page.
export default function AccountCodesPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, username")  // ← id → user_id
      .order("created_at", { ascending: false });
    if (error) { toast.error(error.message); setLoading(false); return; }

    const { data: codes } = await supabase.from("account_codes").select("*");
    const map = new Map((codes ?? []).map((c: any) => [c.user_id, c]));
    setRows((profiles ?? []).map((p: any) => ({ ...p, id: p.user_id, codes: map.get(p.user_id) })));  // ← map user_id to id
    setLoading(false);
  };


  useEffect(() => { document.title = "Admin · Account Codes"; load(); }, []);

  const filtered = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (r.email || "").toLowerCase().includes(q) || (r.full_name || "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">Account Codes</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">Manage Auth / COT / Tax codes inside each user</p>
      </div>
      <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="space-y-2">
        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No users</p>
        ) : filtered.map((u) => {
          const c = u.codes;
          const reqs: string[] = [];
          if (c?.auth_required) reqs.push("Auth");
          if (c?.cot_required) reqs.push("COT");
          if (c?.tax_required) reqs.push("Tax");
          return (
            <Card key={u.id}>
              <CardContent className="flex items-center justify-between gap-2 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-500/10">
                    <ShieldAlert className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{u.full_name || "—"}</p>
                    <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Required: {reqs.length ? reqs.join(", ") : "none"}
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate(`/admin/users/${u.id}`)}>
                  <Eye className="mr-1 h-3.5 w-3.5" /> Open
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
