import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "../components/StatusBadge";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export default function ManagersList() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("managers").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => { document.title = "Admin · Managers"; load(); }, []);

  const remove = async (m: any) => {
    if (!confirm(`Remove ${m.full_name}?`)) return;
    if (m.user_id) await supabase.functions.invoke("admin-delete-user", { body: { user_id: m.user_id } });
    await supabase.from("managers").delete().eq("id", m.id);
    toast.success("Removed");
    load();
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Managers</h1>
        <p className="text-sm text-muted-foreground">{rows.length} total</p>
      </div>
      <Card>
        <CardContent className="p-4">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
                : rows.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No managers</TableCell></TableRow>
                : rows.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.full_name}</TableCell>
                  <TableCell className="text-sm">{m.email}</TableCell>
                  <TableCell><span className="inline-flex rounded-full bg-secondary px-2 py-0.5 text-xs capitalize">{m.role.replace("_", " ")}</span></TableCell>
                  <TableCell><StatusBadge status={m.status} /></TableCell>
                  <TableCell className="text-sm">{new Date(m.created_at).toLocaleDateString()}</TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={() => remove(m)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
