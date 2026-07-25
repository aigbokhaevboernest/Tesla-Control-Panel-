import { useEffect, useState } from "react";
import { supabase as supabaseTyped } from "@/lib/supabaseClient";
const supabase: any = supabaseTyped;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Trash2, Pencil, Plus, Landmark, X } from "lucide-react";

type BankField = { label: string; value: string };

type Bank = {
  id: string;
  is_active: boolean;
  fields: BankField[];
};

export default function BankInfoPage() {
  const [rows, setRows] = useState<Bank[]>([]);
  const [editing, setEditing] = useState<Partial<Bank> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bank_deposit_info")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows(
      ((data ?? []) as any[]).map((r) => ({
        id: r.id,
        is_active: r.is_active,
        fields: r.fields ?? [],
      }))
    );
    setLoading(false);
  };

  useEffect(() => { document.title = "Admin · Bank Info"; load(); }, []);

  const fields = editing?.fields ?? [];

  const setFields = (next: BankField[]) => {
    if (!editing) return;
    setEditing({ ...editing, fields: next });
  };

  const addField = () => setFields([...fields, { label: "", value: "" }]);

  const updateField = (idx: number, key: "label" | "value", val: string) => {
    const next = fields.slice();
    next[idx] = { ...next[idx], [key]: val };
    setFields(next);
  };

  const removeField = (idx: number) => {
    setFields(fields.filter((_, i) => i !== idx));
  };

  const save = async () => {
    if (!editing) return;
    const cleaned = (editing.fields ?? []).filter((f) => f.label.trim() && f.value.trim());
    if (cleaned.length === 0) {
      return toast.error("Add at least one field");
    }
    const payload = {
      is_active: !!editing.is_active,
      fields: cleaned,
    };
    if (editing.id) {
      const { error } = await supabase.from("bank_deposit_info").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Bank updated");
    } else {
      const { error } = await supabase.from("bank_deposit_info").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Bank added");
    }
    setEditing(null);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this bank?")) return;
    const { error } = await supabase.from("bank_deposit_info").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const toggleActive = async (b: Bank) => {
    const { error } = await supabase
      .from("bank_deposit_info")
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
        <Button size="sm" onClick={() => setEditing({ is_active: false, fields: [{ label: "", value: "" }] })}>
          <Plus className="mr-1.5 h-4 w-4" /> Add
        </Button>
      </div>

      {editing && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">{editing.id ? "Edit Bank" : "New Bank"}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Switch checked={!!editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: !!v })} />
              <Label>Active (visible to users)</Label>
            </div>

            <div className="space-y-2 border-t pt-3">
              <div className="flex items-center justify-between">
                <Label>Fields</Label>
                <Button size="sm" variant="outline" onClick={addField}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add Field
                </Button>
              </div>
              {fields.length === 0 && (
                <p className="text-xs text-muted-foreground">No fields yet.</p>
              )}
              {fields.map((f, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder="Label (e.g. Bank Name, IBAN, SWIFT)"
                    value={f.label}
                    onChange={(e) => updateField(idx, "label", e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Value"
                    value={f.value}
                    onChange={(e) => updateField(idx, "value", e.target.value)}
                    className="flex-1"
                  />
                  <Button size="icon" variant="ghost" onClick={() => removeField(idx)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
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
                    <p className="truncate text-sm font-semibold">
                      {b.fields[0]?.value || "Bank"}
                    </p>
                    <Switch checked={!!b.is_active} onCheckedChange={() => toggleActive(b)} />
                  </div>
                  {b.fields.map((f, i) => (
                    <p key={i} className="truncate text-[11px] text-muted-foreground">
                      {f.label}: <span className="font-mono">{f.value}</span>
                    </p>
                  ))}
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => setEditing({ ...b, fields: b.fields.length ? b.fields : [{ label: "", value: "" }] })}>
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
