import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Trash2, Pencil, Plus, Landmark } from "lucide-react";

type Bank = {
  id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  routing_number: string | null;
  swift_code: string | null;
  is_active: boolean;
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
    const { bank_name, account_number, account_name, routing_number, swift_code } = editing;
    if (!bank_name?.trim() || !account_number?.trim() || !account_name?.trim()) {
      return toast.error("Bank name, account name and account number are required");
    }
    const payload = {
      bank_name, account_number, account_name,
      routing_number: routing_number || null,
      swift_code: swift_code || null,
      is_active: editing.is_active ?? true,
    };
    if (editing.id) {
      const { error } = await supabase.from("withdrawal_bank_info").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Bank updated");
    } else {
      const { error } = await supabase.from("withdrawal_bank_info").insert(payload);
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
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Bank Info</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">Bank details shown to users for deposits</p>
        </div>
        <Button size="sm" onClick={() => setEditing({ is_active: true })}>
          <Plus className="mr-1.5 h-4 w-4" /> Add
        </Button>
      </div>

      {editing && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">{editing.id ? "Edit Bank" : "New Bank"}</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
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
            <div>
              <Label>Routing Number</Label>
              <Input value={editing.routing_number ?? ""} onChange={(e) => setEditing({ ...editing, routing_number: e.target.value })} />
            </div>
            <div>
              <Label>SWIFT Code</Label>
              <Input value={editing.swift_code ?? ""} onChange={(e) => setEditing({ ...editing, swift_code: e.target.value })} />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch checked={editing.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
              <Label>Active (visible to users)</Label>
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <Button onClick={save}>Save</Button>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No banks yet</p>
        ) : rows.map((b) => (
          <Card key={b.id}>
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-500/10">
                  <Landmark className="h-5 w-5 text-blue-500" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{b.bank_name}</p>
                    <Switch checked={b.is_active} onCheckedChange={() => toggleActive(b)} />
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{b.account_name}</p>
                  <p className="truncate font-mono text-xs">{b.account_number}</p>
                  {b.routing_number && <p className="truncate text-[11px] text-muted-foreground">Routing: <span className="font-mono">{b.routing_number}</span></p>}
                  {b.swift_code && <p className="truncate text-[11px] text-muted-foreground">SWIFT: <span className="font-mono">{b.swift_code}</span></p>}
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => setEditing(b)}>
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => del(b.id)}>
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
