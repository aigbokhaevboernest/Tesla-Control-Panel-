import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Trash2, Pencil, Plus } from "lucide-react";

type Bank = {
  id: string; bank_name: string; account_number: string; account_name: string; is_active: boolean;
};

export default function BankInfoPage() {
  const [rows, setRows] = useState<Bank[]>([]);
  const [editing, setEditing] = useState<Partial<Bank> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("withdrawal_bank_info")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as Bank[]);
    setLoading(false);
  };

  useEffect(() => { document.title = "Admin · Bank Info"; load(); }, []);

  const save = async () => {
    if (!editing) return;
    const { bank_name, account_number, account_name } = editing;
    if (!bank_name?.trim() || !account_number?.trim() || !account_name?.trim()) {
      return toast.error("All fields are required");
    }
    if (editing.id) {
      const { error } = await supabase.from("withdrawal_bank_info").update({
        bank_name, account_number, account_name, is_active: editing.is_active ?? true,
      }).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Bank updated");
    } else {
      const { error } = await supabase.from("withdrawal_bank_info").insert({
        bank_name, account_number, account_name, is_active: editing.is_active ?? true,
      });
      if (error) return toast.error(error.message);
      toast.success("Bank added");
    }
    setEditing(null);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this bank?")) return;
    const { error } = await supabase.from("withdrawal_bank_info").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const toggleActive = async (b: Bank) => {
    const { error } = await supabase
      .from("withdrawal_bank_info")
      .update({ is_active: !b.is_active })
      .eq("id", b.id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Bank Info</h1>
          <p className="text-sm text-muted-foreground">Bank details shown to users for deposits</p>
        </div>
        <Button onClick={() => setEditing({ is_active: true })}>
          <Plus className="mr-2 h-4 w-4" /> Add Bank
        </Button>
      </div>

      {editing && (
        <Card>
          <CardHeader><CardTitle>{editing.id ? "Edit Bank" : "New Bank"}</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Bank Name *</Label>
              <Input value={editing.bank_name ?? ""} onChange={(e) => setEditing({ ...editing, bank_name: e.target.value })} />
            </div>
            <div>
              <Label>Account Name *</Label>
              <Input value={editing.account_name ?? ""} onChange={(e) => setEditing({ ...editing, account_name: e.target.value })} />
            </div>
            <div>
              <Label>Account Number *</Label>
              <Input value={editing.account_number ?? ""} onChange={(e) => setEditing({ ...editing, account_number: e.target.value })} />
            </div>
            <div className="flex items-end gap-3">
              <div className="flex items-center gap-2">
                <Switch checked={editing.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                <Label>Active (visible to users)</Label>
              </div>
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button onClick={save}>Save</Button>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bank</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead>Account Number</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No banks yet</TableCell></TableRow>
              ) : rows.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.bank_name}</TableCell>
                  <TableCell>{b.account_name}</TableCell>
                  <TableCell className="font-mono text-sm">{b.account_number}</TableCell>
                  <TableCell><Switch checked={b.is_active} onCheckedChange={() => toggleActive(b)} /></TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="outline" onClick={() => setEditing(b)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="destructive" onClick={() => del(b.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
