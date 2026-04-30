import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Eye } from "lucide-react";

export default function AccountCodesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    // Load all profiles + their codes
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id, full_name, email, username")
      .order("created_at", { ascending: false });
    if (pErr) { toast.error(pErr.message); setLoading(false); return; }
    const { data: codes } = await supabase.from("account_codes").select("*");
    const map = new Map((codes ?? []).map((c) => [c.user_id, c]));
    setRows((profiles ?? []).map((p) => ({ ...p, codes: map.get(p.id) })));
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
        <h1 className="text-2xl font-semibold">Account Codes</h1>
        <p className="text-sm text-muted-foreground">Generate withdrawal codes (Auth, COT, Tax) per user</p>
      </div>
      <Card>
        <CardContent className="p-4">
          <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4 max-w-xs" />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Auth Code</TableHead>
                <TableHead>COT Code</TableHead>
                <TableHead>Tax Code</TableHead>
                <TableHead>Required</TableHead>
                <TableHead className="text-right">Manage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No users</TableCell></TableRow>
              ) : filtered.map((u) => {
                const c = u.codes;
                const reqs: string[] = [];
                if (c?.auth_required) reqs.push("Auth");
                if (c?.cot_required) reqs.push("COT");
                if (c?.tax_required) reqs.push("Tax");
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <p className="text-sm font-medium">{u.full_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{c?.auth_code || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{c?.cot_code || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{c?.tax_code || "—"}</TableCell>
                    <TableCell className="text-xs">{reqs.length ? reqs.join(", ") : <span className="text-muted-foreground">none</span>}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/admin/users/${u.id}`}><Eye className="mr-1 h-3.5 w-3.5" /> Open</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
